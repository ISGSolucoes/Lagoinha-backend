import { Router } from "express";
import { executeQuery } from "../config/database.js";

const router = Router();

let cache = {
    member: null,
    lastUpdate: null,
    CACHE_DURATION: 300000,
};

function clearCache() {
    cache.member = null;
    cache.lastUpdate = null;
}

// GET - Listar todos os membros
router.get("/", async (req, res) => {
    if (
        cache.member &&
        cache.lastUpdate &&
        Date.now() - cache.lastUpdate < cache.CACHE_DURATION
    ) {
        return res.json(cache.member);
    }

    try {
        const query = `
      SELECT
        A.CD_IGREJA,
        B.fantasia AS NOME_IGREJA,
        A.CD_MEMBRO,
        A.NOME,
        A.CPF,
        A.ENDERECO,
        A.NRO,
        A.BAIRRO,
        A.CD_CIDADE,
        C.nome AS NOME_CIDADE,
        C.uf AS UF,
        A.CEP,
        A.CD_SITUACAO,
        D.nome AS NOME_SITUACAO,
        A.CELULAR,
        A.EMAIL,
        A.CD_GC,
        E.nome AS NOME_GC,
        A.FL_VISITANTE,
        A.FL_BATIZADO,
        A.FL_CAFE_MEMBRO
      FROM MEMBRO A
      LEFT JOIN IGREJA B ON B.cd_igreja = A.cd_igreja
      LEFT JOIN CIDADE C ON C.cd_cidade = A.cd_cidade
      LEFT JOIN SITUACAO D ON D.cd_situacao = A.cd_situacao
      LEFT JOIN grupo_crescimento E ON E.cd_igreja = A.cd_igreja AND E.cd_gc = A.cd_gc
      WHERE A.CD_SITUACAO IN (1, 2)
      ORDER BY A.CD_MEMBRO desc
    `;

        const result = await executeQuery(query);

        cache.gcs = result;
        cache.lastUpdate = Date.now();

        return res.json(result);
    } catch (error) {
        console.error("Erro ao buscar GCs:", error);
        return res.status(500).json({
            erro: "Falha ao buscar GCs",
            detalhes: error.message,
        });
    }
});

// GET - Buscar GC por ID
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
      SELECT
        A.CD_IGREJA,
        B.fantasia AS NOME_IGREJA,
        A.CD_MEMBRO,
        A.NOME,
        A.CPF,
        A.ENDERECO,
        A.NRO,
        A.BAIRRO,
        A.CD_CIDADE,
        C.nome AS NOME_CIDADE,
        C.uf AS UF,
        A.CEP,
        A.CD_SITUACAO,
        D.nome AS NOME_SITUACAO,
        A.CELULAR,
        A.EMAIL,
        A.CD_GC,
        E.nome AS NOME_GC,
        A.FL_VISITANTE,
        A.FL_BATIZADO,
        A.FL_CAFE_MEMBRO
      FROM MEMBRO A
      LEFT JOIN IGREJA B ON B.cd_igreja = A.cd_igreja
      LEFT JOIN CIDADE C ON C.cd_cidade = A.cd_cidade
      LEFT JOIN SITUACAO D ON D.cd_situacao = A.cd_situacao
      LEFT JOIN grupo_crescimento E ON E.cd_igreja = A.cd_igreja AND E.cd_gc = A.cd_gc
      WHERE A.CD_MEMBRO = ?
    `;

        const result = await executeQuery(query, [id]);

        if (!result || result.length === 0) {
            return res.status(404).json({ erro: "Membro não encontrado" });
        }

        return res.json(result[0]);
    } catch (error) {
        console.error("Erro ao buscar Membro:", error);
        return res.status(500).json({
            erro: "Falha ao buscar Membro",
            detalhes: error.message,
        });
    }
});

// POST - Criar novo Membro
router.post("/", async (req, res) => {
    try {
        const {
            CD_IGREJA,
            NOME,
            CPF,
            ENDERECO,
            NRO,
            BAIRRO,
            CD_CIDADE,
            CEP,
            CD_SITUACAO,
            CELULAR,
            EMAIL,
            CD_GC,
            FL_VISITANTE,
            FL_BATIZADO,
            FL_CAFE_MEMBRO,
        } = req.body;

        if (!CD_IGREJA || !NOME || !FL_VISITANTE || !FL_BATIZADO || !FL_CAFE_MEMBRO || !CD_SITUACAO) {
            return res.status(400).json({
                erro: "Campos obrigatórios não preenchidos",
                camposObrigatorios: ["CD_IGREJA", "NOME", "FL_VISITANTE", "FL_BATIZADO", "FL_CAFE_MEMBRO", "CD_SITUACAO"],
            });
        }

        const queryAux = `
      SELECT COALESCE(MAX(CD_MEMBRO), 0) + 1 AS NEWCD_MEMBRO
      FROM MEMBRO
      WHERE CD_IGREJA = ?
    `;
        const resultSelect = await executeQuery(queryAux, [CD_IGREJA]);
        const CD_MEMBRO = resultSelect[0].NEWCD_MEMBRO;

        const query = `
      INSERT INTO MEMBRO (
        CD_IGREJA,
        CD_MEMBRO,
        NOME,
        CPF,
        ENDERECO,
        NRO,
        BAIRRO,
        CD_CIDADE,
        CEP,
        CD_SITUACAO,
        CELULAR,
        EMAIL,
        CD_GC,
        FL_VISITANTE,
        FL_BATIZADO,
        FL_CAFE_MEMBRO
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING CD_MEMBRO AS ID, NOME
    `;

        const result = await executeQuery(query, [
            CD_IGREJA,
            CD_MEMBRO,
            NOME,
            CPF,
            ENDERECO,
            NRO,
            BAIRRO,
            CD_CIDADE,
            CEP,
            CD_SITUACAO,
            CELULAR,
            EMAIL,
            CD_GC,
            FL_VISITANTE,
            FL_BATIZADO,
            FL_CAFE_MEMBRO,
        ]);

        clearCache();

        return res.status(201).json({
            success: true,
            message: "Membro cadastrado com sucesso",
            data: result[0],
        });
    } catch (error) {
        console.error("Erro ao criar Membro:", error);

        if (error.message && error.message.toLowerCase().includes("unique")) {
            return res.status(400).json({
                erro: "Membro já cadastrado no sistema",
            });
        }

        return res.status(500).json({
            erro: "Falha ao criar Membro",
            detalhes: error.message,
        });
    }
});

// PUT - Atualizar GC
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const {
            CD_IGREJA,
            CD_MEMBRO,
            NOME,
            CPF,
            ENDERECO,
            NRO,
            BAIRRO,
            CD_CIDADE,
            CEP,
            CD_SITUACAO,
            CELULAR,
            EMAIL,
            CD_GC,
            FL_VISITANTE,
            FL_BATIZADO,
            FL_CAFE_MEMBRO,
        } = req.body;

        const checkQuery = `
      SELECT CD_MEMBRO
      FROM MEMBRO
      WHERE CD_MEMBRO = ?
    `;
        const checkResult = await executeQuery(checkQuery, [id]);

        if (!checkResult || checkResult.length === 0) {
            return res.status(404).json({ erro: "Membro não encontrado" });
        }

        const query = `
      UPDATE MEMBRO
      SET
        CD_IGREJA = ?,
        NOME = ?,
        CPF = ?,
        ENDERECO = ?,
        NRO = ?,
        BAIRRO = ?,
        CD_CIDADE = ?,
        CEP = ?,
        CD_SITUACAO = ?,
        CELULAR = ?,
        EMAIL = ?,
        CD_GC = ?,
        FL_VISITANTE = ?,
        FL_BATIZADO = ?,
        FL_CAFE_MEMBRO = ?,
      WHERE CD_MEMBRO = ?
      RETURNING CD_MEMBRO AS ID, NOME
    `;

        const result = await executeQuery(query, [
            CD_IGREJA,
            NOME,
            CPF,
            ENDERECO,
            NRO,
            BAIRRO,
            CD_CIDADE,
            CEP,
            CD_SITUACAO,
            CELULAR,
            EMAIL,
            CD_GC,
            FL_VISITANTE,
            FL_BATIZADO,
            FL_CAFE_MEMBRO,
            id,
        ]);

        clearCache();

        return res.json({
            success: true,
            message: "Membro atualizado com sucesso",
            data: result[0],
        });
    } catch (error) {
        console.error("Erro ao atualizar Membro:", error);

        if (error.message && error.message.toLowerCase().includes("unique")) {
            return res.status(400).json({
                erro: "Membro já cadastrado no sistema",
            });
        }

        return res.status(500).json({
            erro: "Falha ao atualizar Membro",
            detalhes: error.message,
        });
    }
});

// DELETE - Inativar GC
router.delete("/:id", async (req, res) => {
    try {
        const { id } = req.params;

        const checkQuery = `
      SELECT CD_MEMBRO
      FROM MEMBRO
      WHERE CD_MEMBRO = ?
    `;
        const checkResult = await executeQuery(checkQuery, [id]);

        if (!checkResult || checkResult.length === 0) {
            return res.status(404).json({ erro: "Membro não encontrado" });
        }

        const query = `
      UPDATE MEMBRO
      SET
        CD_SITUACAO = 2
      WHERE CD_MEMBRO = ?
      RETURNING CD_MEMBRO AS ID, NOME
    `;

        const result = await executeQuery(query, [id]);

        clearCache();

        return res.json({
            success: true,
            message: "Membro inativado com sucesso",
            data: result[0],
        });
    } catch (error) {
        console.error("Erro ao excluir Membro:", error);
        return res.status(500).json({
            erro: "Falha ao excluir Membro",
            detalhes: error.message,
        });
    }
});

export default router;