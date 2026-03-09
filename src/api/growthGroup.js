import { Router } from "express";
import { executeQuery } from "../config/database.js";

const router = Router();

let cache = {
  gcs: null,
  lastUpdate: null,
  CACHE_DURATION: 300000,
};

function clearCache() {
  cache.gcs = null;
  cache.lastUpdate = null;
}

// GET - Listar todos os GCs
router.get("/", async (req, res) => {
  if (
    cache.gcs &&
    cache.lastUpdate &&
    Date.now() - cache.lastUpdate < cache.CACHE_DURATION
  ) {
    return res.json(cache.gcs);
  }

  try {
    const query = `
      SELECT
        A.CD_IGREJA AS CD_SUPERVISAO,
        B.FANTASIA AS NOME_SUPERVISAO,
        A.CD_GC,
        A.NOME,
        A.DESCRICAO,
        A.ENDERECO,
        A.NRO,
        A.BAIRRO,
        A.BAIRRO || ', ' || C.NOME || '-' || C.UF AS REGIAO,
        A.CD_CIDADE,
        A.CEP,
        A.CD_SITUACAO,
        A.CD_LIDER,
        D.NOME AS NOME_LIDER,
        A.CD_COLIDER,
        E.NOME AS NOME_COLIDER,
        A.EMAIL,
        A.DIA_SEMANA_REUNIAO
      FROM GRUPO_CRESCIMENTO A
      LEFT JOIN IGREJA B
        ON B.CD_IGREJA = A.CD_IGREJA
      LEFT JOIN CIDADE C
        ON C.CD_CIDADE = A.CD_CIDADE
      LEFT JOIN MEMBRO D
        ON D.CD_IGREJA = A.CD_IGREJA
       AND D.CD_MEMBRO = A.CD_LIDER
      LEFT JOIN MEMBRO E
        ON E.CD_IGREJA = A.CD_IGREJA
       AND E.CD_MEMBRO = A.CD_COLIDER
      WHERE A.CD_SITUACAO IN (1, 2)
      ORDER BY A.CD_GC
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
        A.CD_IGREJA AS CD_SUPERVISAO,
        B.FANTASIA AS NOME_SUPERVISAO,
        A.CD_GC,
        A.NOME,
        A.DESCRICAO,
        A.ENDERECO,
        A.NRO,
        A.BAIRRO,
        A.BAIRRO || ', ' || C.NOME || '-' || C.UF AS REGIAO,
        A.CD_CIDADE,
        A.CEP,
        A.CD_SITUACAO,
        A.CD_LIDER,
        D.NOME AS NOME_LIDER,
        A.CD_COLIDER,
        E.NOME AS NOME_COLIDER,
        A.EMAIL,
        A.DIA_SEMANA_REUNIAO
      FROM GRUPO_CRESCIMENTO A
      LEFT JOIN IGREJA B
        ON B.CD_IGREJA = A.CD_IGREJA
      LEFT JOIN CIDADE C
        ON C.CD_CIDADE = A.CD_CIDADE
      LEFT JOIN MEMBRO D
        ON D.CD_IGREJA = A.CD_IGREJA
       AND D.CD_MEMBRO = A.CD_LIDER
      LEFT JOIN MEMBRO E
        ON E.CD_IGREJA = A.CD_IGREJA
       AND E.CD_MEMBRO = A.CD_COLIDER
      WHERE A.CD_GC = ?
    `;

    const result = await executeQuery(query, [id]);

    if (!result || result.length === 0) {
      return res.status(404).json({ erro: "GC não encontrado" });
    }

    return res.json(result[0]);
  } catch (error) {
    console.error("Erro ao buscar GC:", error);
    return res.status(500).json({
      erro: "Falha ao buscar GC",
      detalhes: error.message,
    });
  }
});

// POST - Criar novo GC
router.post("/", async (req, res) => {
  try {
    const {
      CD_IGREJA,
      NOME,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      CD_LIDER,
      EMAIL,
      DIA_SEMANA_REUNIAO,
      CD_COLIDER,
      DESCRICAO,
    } = req.body;

    if (!CD_IGREJA || !NOME || !CD_CIDADE || !CD_SITUACAO) {
      return res.status(400).json({
        erro: "Campos obrigatórios não preenchidos",
        camposObrigatorios: ["CD_IGREJA", "NOME", "CD_CIDADE", "CD_SITUACAO"],
      });
    }

    const queryAux = `
      SELECT COALESCE(MAX(CD_GC), 0) + 1 AS NEWCD_GC
      FROM GRUPO_CRESCIMENTO
      WHERE CD_IGREJA = ?
    `;
    const resultSelect = await executeQuery(queryAux, [CD_IGREJA]);
    const CD_GC = resultSelect[0].NEWCD_GC;

    const query = `
      INSERT INTO GRUPO_CRESCIMENTO (
        CD_IGREJA,
        CD_GC,
        NOME,
        ENDERECO,
        NRO,
        BAIRRO,
        CD_CIDADE,
        CEP,
        CD_SITUACAO,
        CD_LIDER,
        EMAIL,
        DIA_SEMANA_REUNIAO,
        CD_COLIDER,
        DESCRICAO,
        DATA_ATUALIZACAO
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING CD_GC AS ID, NOME
    `;

    const result = await executeQuery(query, [
      CD_IGREJA,
      CD_GC,
      NOME,
      ENDERECO || null,
      NRO || null,
      BAIRRO || null,
      CD_CIDADE,
      CEP || null,
      CD_SITUACAO,
      CD_LIDER || null,
      EMAIL || null,
      DIA_SEMANA_REUNIAO || null,
      CD_COLIDER || null,
      DESCRICAO || null,
    ]);

    clearCache();

    return res.status(201).json({
      success: true,
      message: "GC cadastrado com sucesso",
      data: result[0],
    });
  } catch (error) {
    console.error("Erro ao criar GC:", error);

    if (error.message && error.message.toLowerCase().includes("unique")) {
      return res.status(400).json({
        erro: "GC já cadastrado no sistema",
      });
    }

    return res.status(500).json({
      erro: "Falha ao criar GC",
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
      NOME,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      CD_LIDER,
      EMAIL,
      DIA_SEMANA_REUNIAO,
      CD_COLIDER,
      DESCRICAO,
    } = req.body;

    const checkQuery = `
      SELECT CD_GC
      FROM GRUPO_CRESCIMENTO
      WHERE CD_GC = ?
    `;
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({ erro: "GC não encontrado" });
    }

    const query = `
      UPDATE GRUPO_CRESCIMENTO
      SET
        CD_IGREJA = ?,
        NOME = ?,
        ENDERECO = ?,
        NRO = ?,
        BAIRRO = ?,
        CD_CIDADE = ?,
        CEP = ?,
        CD_SITUACAO = ?,
        CD_LIDER = ?,
        EMAIL = ?,
        DIA_SEMANA_REUNIAO = ?,
        CD_COLIDER = ?,
        DESCRICAO = ?,
        DATA_ATUALIZACAO = CURRENT_TIMESTAMP
      WHERE CD_GC = ?
      RETURNING CD_GC AS ID, NOME
    `;

    const result = await executeQuery(query, [
      CD_IGREJA,
      NOME,
      ENDERECO || null,
      NRO || null,
      BAIRRO || null,
      CD_CIDADE,
      CEP || null,
      CD_SITUACAO,
      CD_LIDER || null,
      EMAIL || null,
      DIA_SEMANA_REUNIAO || null,
      CD_COLIDER || null,
      DESCRICAO || null,
      id,
    ]);

    clearCache();

    return res.json({
      success: true,
      message: "GC atualizado com sucesso",
      data: result[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar GC:", error);

    if (error.message && error.message.toLowerCase().includes("unique")) {
      return res.status(400).json({
        erro: "GC já cadastrado no sistema",
      });
    }

    return res.status(500).json({
      erro: "Falha ao atualizar GC",
      detalhes: error.message,
    });
  }
});

// DELETE - Inativar GC
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = `
      SELECT CD_GC
      FROM GRUPO_CRESCIMENTO
      WHERE CD_GC = ?
    `;
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({ erro: "GC não encontrado" });
    }

    const query = `
      UPDATE GRUPO_CRESCIMENTO
      SET
        CD_SITUACAO = 2,
        DATA_ATUALIZACAO = CURRENT_TIMESTAMP
      WHERE CD_GC = ?
      RETURNING CD_GC AS ID, NOME
    `;

    const result = await executeQuery(query, [id]);

    clearCache();

    return res.json({
      success: true,
      message: "GC inativado com sucesso",
      data: result[0],
    });
  } catch (error) {
    console.error("Erro ao excluir GC:", error);
    return res.status(500).json({
      erro: "Falha ao excluir GC",
      detalhes: error.message,
    });
  }
});

export default router;