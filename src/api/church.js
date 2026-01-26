import { Router } from 'express';
import { executeQuery } from '../config/database.js';

const router = Router();
let cache = {
  igrejas: null,
  lastUpdate: null,
  CACHE_DURATION: 300000 // 5 minutos
};

router.get('/', async (req, res) => {
  if (cache.igrejas && Date.now() - cache.lastUpdate < cache.CACHE_DURATION) {
    return res.json(cache.igrejas);
  }

  try {
    const query = `
      SELECT A.CD_IGREJA as ID, A.FANTASIA as LABEL, A.CD_CIDADE, B.nome||'-'||B.uf AS LOCALIZACAO, A.CNPJ, A.fone, A.email, C.nome AS SITUACAO
        FROM IGREJA A
       INNER JOIN CIDADE B ON B.cd_cidade = A.cd_cidade
       INNER JOIN SITUACAO C ON C.cd_situacao = A.cd_situacao
       WHERE A.CD_SITUACAO = 1`; // 1 = Ativo

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


export default router;