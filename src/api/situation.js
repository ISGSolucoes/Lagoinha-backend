import { Router } from 'express';
import { executeQuery } from '../config/database.js';

const router = Router();

// Rota para situações
router.get('/', async (req, res) => {
    try {
        const query = `
      SELECT CD_SITUACAO, NOME
      FROM SITUACAO
      ORDER BY NOME`;

        const result = await executeQuery(query);

        if (result && result.length > 0) {
            return res.json({
                success: true,
                data: result
            });
        } else {
            // Fallback para dados fixos
            const situacoes = [];

            return res.json({
                success: true,
                data: situacoes
            });
        }

    } catch (error) {
        console.error('Erro ao buscar situações:', error);

        const situacoes = [];

        return res.json({
            success: true,
            data: situacoes
        });
    }
});

export default router;