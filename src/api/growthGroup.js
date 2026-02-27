import { Router } from 'express';
import { executeQuery } from '../config/database.js';

const router = Router();

// Cache para listagem
let cache = {
  gcs: null,
  lastUpdate: null,
  CACHE_DURATION: 300000
};

// GET - Listar todas os gcs (com cache)
router.get('/', async (req, res) => {
  if (cache.gcs && Date.now() - cache.lastUpdate < cache.CACHE_DURATION) {
    return res.json(cache.gcs);
  }

  try {
    const query = `
      SELECT a.CD_IGREJA as cd_supervisao,
             b.fantasia as nome_supervisao,
             a.CD_GC,
             a.NOME,
             a.descricao,
             a.ENDERECO,
             a.NRO,
             a.BAIRRO,
             a.BAIRRO ||', ' || c.nome || '-' || c.uf as regiao,
             a.CD_CIDADE,
             a.CEP,
             a.CD_SITUACAO,
             a.CD_LIDER,
             d.nome as nome_lider,
             a.CD_COLIDER,
             e.nome as nome_coLider,
             a.EMAIL,
             a.DT_REUNIAO
        from GRUPO_CRESCIMENTO A
        left join IGREJA B on B.cd_igreja = A.cd_igreja
        left join cidade C on c.cd_cidade = a.cd_cidade
        left join MEMBRO D on D.cd_igreja = a.cd_igreja and d.cd_membro = a.cd_lider
        left join MEMBRO E on e.cd_igreja = a.cd_igreja and e.cd_membro = a.cd_colider  
        WHERE A.CD_SITUACAO IN (1, 2)`; // 1 = Ativo, 2 = Inativo

    const result = await executeQuery(query);

    console.log('Return get gcs: ', result)

    cache.gcs = result;
    cache.lastUpdate = Date.now();

    return res.json(result);

  } catch (error) {
    console.error('Erro ao buscar gcs:', error);
    return res.status(500).json({
      erro: 'Falha ao buscar gcs',
      detalhes: error.message
    });
  }
});

// GET - Buscar igreja por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT a.CD_IGREJA as cd_supervisao,
             b.fantasia as nome_supervisao,
             a.CD_GC,
             a.NOME,
             a.descricao,
             a.ENDERECO,
             a.NRO,
             a.BAIRRO,
             a.BAIRRO ||', ' || c.nome || '-' || c.uf as regiao,
             a.CD_CIDADE,
             a.CEP,
             a.CD_SITUACAO,
             a.CD_LIDER,
             d.nome as nome_lider,
             a.CD_COLIDER,
             e.nome as nome_coLider,
             a.EMAIL,
             a.DT_REUNIAO
        from GRUPO_CRESCIMENTO A
        left join IGREJA B on B.cd_igreja = A.cd_igreja
        left join cidade C on c.cd_cidade = a.cd_cidade
        left join MEMBRO D on D.cd_igreja = a.cd_igreja and d.cd_membro = a.cd_lider
        left join MEMBRO E on e.cd_igreja = a.cd_igreja and e.cd_membro = a.cd_colider  
        WHERE A.CD_GC = ?`;

    const result = await executeQuery(query, [id]);

    console.log('Result select Gc: ', result)

    if (result.length === 0) {
      return res.status(404).json({ erro: 'Gc não encontrada' });
    }

    return res.json(result[0]);

  } catch (error) {
    console.error('Erro ao buscar gc:', error);
    return res.status(500).json({
      erro: 'Falha ao buscar gc',
      detalhes: error.message
    });
  }
});

// POST - Criar nova igreja
router.post('/', async (req, res) => {
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
      DT_REUNIAO,
      CD_COLIDER,
      DESCRICAO
    } = req.body;

    // Validação básica
    if (!CD_IGREJA || !CD_GC || !NOME || !CD_CIDADE || !CD_SITUACAO) {
      return res.status(400).json({
        erro: 'Campos obrigatórios não preenchidos',
        camposObrigatorios: ['CD_IGREJA', 'CD_GC', 'NOME', 'CD_CIDADE', 'CD_SITUACAO']
      });
    }


    const queryAux = `SELECT COALESCE(CD_GC,0) + 1 AS NEWCD_GC FROM GRUPO_CRESCIMENTO WHERE CD_IGREJA = ? `;
    const resultSelect = await executeQuery(queryAux, [CD_IGREJA]);
    const CD_GC = resultSelect[0].NEWCD_GC;

    const query = `
      INSERT INTO GRUPO_CRESCIMENTO 
        (CD_IGREJA, CD_GC, NOME, ENDERECO, NRO, BAIRRO, CD_CIDADE,
         CEP, CD_SITUACAO, CD_LIDER, EMAIL, DT_REUNIAO, CD_COLIDER, DESCRICAO)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING CD_GC as ID, NOME`;

    const result = await executeQuery(query, [
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
      DT_REUNIAO,
      CD_COLIDER,
      DESCRICAO
    ]);

    // Invalidar cache
    cache.gcs = null;

    return res.status(201).json({
      success: true,
      message: 'GC cadastrado com sucesso',
      data: result[0]
    });

  } catch (error) {
    console.error('Erro ao criar GC:', error);

    // Verificar se é erro de chave única (CNPJ duplicado)
    if (error.message && error.message.includes('unique constraint')) {
      return res.status(400).json({
        erro: 'GC já cadastrado no sistema'
      });
    }

    return res.status(500).json({
      erro: 'Falha ao criar GC',
      detalhes: error.message
    });
  }
});



// PUT - Atualizar igreja
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
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
      DT_REUNIAO,
      CD_COLIDER,
      DESCRICAO
    } = req.body;

    // Verificar se a GC existe
    const checkQuery = 'SELECT CD_GC FROM GRUPO_CRESCIMENTO WHERE CD_IGREJA = ? AND CD_GC = ?';
    const checkResult = await executeQuery(checkQuery, [CD_IGREJA, CD_GC]);

    if (checkResult.length === 0) {
      return res.status(404).json({ erro: 'GC não encontrado' });
    }

    console.log('checkResult: ', checkResult)

    const query = `
      UPDATE GRUPO_CRESCIMENTO SET
        NOME = ?,
        ENDERECO = ?,
        NRO = ?,
        BAIRRO = ?,
        CD_CIDADE = ?,
        CEP = ?,
        CD_SITUACAO = ?,
        CD_LIDER = ?,
        EMAIL = ?,
        DT_REUNIAO = ?,
        CD_COLIDER = ?,
        DESCRICAO = ?,
        DATA_ATUALIZACAO = CURRENT_TIMESTAMP
      WHERE CD_IGREJA = ?
        AND CD_GC = ? 
      RETURNING CD_IGREJA as ID, FANTASIA`;

    const result = await executeQuery(query, [
      NOME,
      ENDERECO,
      NRO,
      BAIRRO,
      CD_CIDADE,
      CEP,
      CD_SITUACAO,
      CD_LIDER,
      EMAIL,
      DT_REUNIAO,
      CD_COLIDER,
      DESCRICAO,
      CD_IGREJA,
      CD_GC
    ]);

    console.log('Retorno atualizacao GC: ', result)

    // Invalidar cache
    cache.gcs = null;

    return res.json({
      success: true,
      message: 'GC atualizado com sucesso',
      data: result[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar GC:', error);

    if (error.message && error.message.includes('unique constraint')) {
      return res.status(400).json({
        erro: 'GC já cadastrado no sistema'
      });
    }

    return res.status(500).json({
      erro: 'Falha ao atualizar GC',
      detalhes: error.message
    });
  }
});

// DELETE - Excluir GC (marcar como inativa)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se a igreja existe
    const checkQuery = 'SELECT CD_GC FROM GRUPO_CRESCIMENTO WHERE CD_IGREJA = ? AND CD_GC = ?';
    const checkResult = await executeQuery(checkQuery, [CD_IGREJA, CD_GC]);


    if (checkResult.length === 0) {
      return res.status(404).json({ erro: 'GC não encontrada' });
    }

    // Em vez de excluir, podemos marcar como inativa
    const query = `
      UPDATE GRUPO_CRESCIMENTO 
      SET CD_SITUACAO = 2, DATA_ATUALIZACAO = CURRENT_TIMESTAMP
      WHERE CD_IGREJA = ?
        AND CD_GC = ? 
      RETURNING CD_GC as ID, NOME`;

    const result = await executeQuery(query, [CD_IGREJA, CD_GC]);

    // Invalidar cache
    cache.gcs = null;

    return res.json({
      success: true,
      message: 'GC excluída com sucesso',
      data: result[0]
    });

  } catch (error) {
    console.error('Erro ao excluir GC:', error);
    return res.status(500).json({
      erro: 'Falha ao excluir GC',
      detalhes: error.message
    });
  }
});

export default router;