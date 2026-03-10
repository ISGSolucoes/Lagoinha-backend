import { Router } from 'express';
import { executeQuery } from '../config/database.js';

const router = Router();
let cache = {
  igrejas: null,
  lastUpdate: null,
  CACHE_DURATION: 300000 // 5 minutos
};

const clearCache = () => {
  cache.igrejas = null;
  cache.lastUpdate = null;
};

router.get('/', async (req, res) => {
  if (cache.igrejas && Date.now() - cache.lastUpdate < cache.CACHE_DURATION) {
    return res.json(cache.igrejas);
  }

  try {
    const query = `
      SELECT A.CD_IGREJA,
             A.RAZAO_SOCIAL,
             A.FANTASIA,
             A.CNPJ,
             A.IE,
             A.ENDERECO,
             A.NRO,
             A.BAIRRO,
             A.CD_CIDADE,
             A.CEP,
             A.CD_SITUACAO,
             A.FONE,
             A.EMAIL,
             A.DATA_CADASTRO,
             A.DATA_ATUALIZACAO,
             A.UF,
             A.CD_IGREJA as ID, 
             A.FANTASIA as LABEL, 
             B.nome||'-'||B.uf AS LOCALIZACAO, 
             C.nome AS SITUACAO
        FROM IGREJA A
       INNER JOIN CIDADE B ON B.cd_cidade = A.cd_cidade
       INNER JOIN SITUACAO C ON C.cd_situacao = A.cd_situacao
      `;

    const result = await executeQuery(query);

    cache.igrejas = result;
    cache.lastUpdate = Date.now();

    return res.json(result);

  } catch (error) {
    console.error('Erro ao buscar igrejas:', error);
    return res.status(500).json({
      erro: 'Falha ao buscar igrejas',
      detalhes: error.message
    });
  }
});

// Outras rotas de igreja
router.get('/list', (req, res) => {
  res.json({ message: "Lista de igrejas" });
});

// POST - Criar nova Igreja
router.post("/", async (req, res) => {
  try {
    const {
      RAZAO_SOCIAL,
      FANTASIA,
      CNPJ,
      IE,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      FONE,
      EMAIL,
      DATA_CADASTRO,
      DATA_ATUALIZACAO,
      UF,
    } = req.body;

    if (!FANTASIA || !CD_CIDADE || !CD_SITUACAO) {
      return res.status(400).json({
        erro: "Campos obrigatórios não preenchidos",
        camposObrigatorios: ["FANTASIA", "CD_CIDADE", "CD_SITUACAO"],
      });
    }

    const queryAux = `
      SELECT COALESCE(MAX(CD_IGREJA), 0) + 1 AS NEWCD_IGREJA
      FROM IGREJA
    `;
    const resultSelect = await executeQuery(queryAux);
    const CD_IGREJA = resultSelect[0].NEWCD_IGREJA;

    const query = `
      INSERT INTO IGREJA (
        CD_IGREJA,
        RAZAO_SOCIAL,
        FANTASIA,
        CNPJ,
        IE,
        ENDERECO,
        NRO,
        BAIRRO,
        CD_CIDADE,
        CEP,
        CD_SITUACAO,
        FONE,
        EMAIL,
        DATA_CADASTRO,
        DATA_ATUALIZACAO,
        UF
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING CD_IGREJA AS ID, FANTASIA
    `;

    const result = await executeQuery(query, [
      CD_IGREJA,
      RAZAO_SOCIAL,
      FANTASIA,
      CNPJ,
      IE,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      FONE,
      EMAIL,
      DATA_CADASTRO,
      DATA_ATUALIZACAO,
      UF,
    ]);

    clearCache();

    return res.status(201).json({
      success: true,
      message: "Igreja cadastrada com sucesso",
      data: result[0],
    });
  } catch (error) {
    console.error("Erro ao criar Igreja:", error);

    if (error.message && error.message.toLowerCase().includes("unique")) {
      return res.status(400).json({
        erro: "Igreja já cadastrada no sistema",
      });
    }

    return res.status(500).json({
      erro: "Falha ao criar Igreja",
      detalhes: error.message,
    });
  }
});

// PUT - Atualizar Igreja
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      RAZAO_SOCIAL,
      FANTASIA,
      CNPJ,
      IE,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      FONE,
      EMAIL,
      DATA_CADASTRO,
      DATA_ATUALIZACAO,
      UF,
    } = req.body;

    const checkQuery = `
      SELECT CD_IGREJA
      FROM IGREJA
      WHERE CD_IGREJA = ?
    `;
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({ erro: "Igreja não encontrada" });
    }

    const query = `
      UPDATE IGREJA
      SET
        RAZAO_SOCIAL = ?,
        FANTASIA = ?,
        CNPJ = ?,
        IE = ?,
        ENDERECO = ?,
        NRO = ?,
        BAIRRO = ?,
        CD_CIDADE = ?,
        CEP = ?,
        CD_SITUACAO = ?,
        FONE = ?,
        EMAIL = ?,
        DATA_CADASTRO = ?,
        DATA_ATUALIZACAO = CURRENT_TIMESTAMP,
        UF = ?
      WHERE CD_IGREJA = ?
      RETURNING CD_IGREJA AS ID, FANTASIA
    `;

    const result = await executeQuery(query, [
      RAZAO_SOCIAL,
      FANTASIA,
      CNPJ,
      IE,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      FONE,
      EMAIL,
      DATA_CADASTRO,
      UF,
      id,
    ]);

    clearCache();

    return res.json({
      success: true,
      message: "Igreja atualizada com sucesso",
      data: result[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar Igreja:", error);

    if (error.message && error.message.toLowerCase().includes("unique")) {
      return res.status(400).json({
        erro: "Igreja já cadastrada no sistema",
      });
    }

    return res.status(500).json({
      erro: "Falha ao atualizar Igreja",
      detalhes: error.message,
    });
  }
});

// DELETE - Inativar Igreja
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const checkQuery = `
      SELECT CD_IGREJA
      FROM IGREJA
      WHERE CD_IGREJA = ?
    `;
    const checkResult = await executeQuery(checkQuery, [id]);

    if (!checkResult || checkResult.length === 0) {
      return res.status(404).json({ erro: "Igreja não encontrada" });
    }

    const query = `
      UPDATE IGREJA
      SET
        CD_SITUACAO = 2,
        DATA_ATUALIZACAO = CURRENT_TIMESTAMP
      WHERE CD_IGREJA = ?
      RETURNING CD_IGREJA AS ID, FANTASIA
    `;

    const result = await executeQuery(query, [id]);

    clearCache();

    return res.json({
      success: true,
      message: "Igreja inativada com sucesso",
      data: result[0],
    });
  } catch (error) {
    console.error("Erro ao excluir Igreja:", error);
    return res.status(500).json({
      erro: "Falha ao excluir Igreja",
      detalhes: error.message,
    });
  }
});


export default router;