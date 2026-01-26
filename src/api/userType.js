import { Router } from 'express';
import { executeQuery } from '../config/database.js';

const router = Router();
let cache = {
    tipoUsuarios: null,
    lastUpdate: null,
    CACHE_DURATION: 300000 // 5 minutos
};

router.get('/', async (req, res) => {
    // Verifica cache primeiro
    if (cache.tipoUsuarios && Date.now() - cache.lastUpdate < cache.CACHE_DURATION) {
        return res.json(cache.tipoUsuarios);
    }

    try {
        const query = `
      SELECT CD_TIPO as ID, NOME as LABEL, FL_ADM_GERAL, FL_ADM_GCS, FL_LIDER_GC
      FROM TIPO_USUARIO
      WHERE CD_SITUACAO = 1`; // 1 = Ativo

        const result = await executeQuery(query);

        // Atualiza cache
        cache.tipoUsuarios = result;
        cache.lastUpdate = Date.now();

        return res.json(result);

    } catch (error) {
        console.error('Erro ao buscar tipos de usuário:', error);
        return res.status(500).json({
            erro: 'Falha ao buscar tipos de usuário',
            detalhes: error.message
        });
    }
})

router.get('/test', (req, res) => {
    res.json({ message: "Rota de teste funciona!" });
});

export default router;