import { Router } from 'express';
import { executeQuery } from '../config/database.js';

const router = Router();

// Rota para estados
router.get('/estados', async (req, res) => {
    try {
        // Se você tiver uma tabela de estados no banco
        const query = `
      SELECT UF, NOME, CD_SITUACAO
      FROM ESTADO
      ORDER BY NOME`;

        const result = await executeQuery(query);

        // Se não tiver tabela, retorne os dados fixos
        if (result && result.length > 0) {
            return res.json({
                success: true,
                data: result
            });
        } else {
            // Fallback para dados fixos
            const estados = [
                { value: "PR", label: "Paraná" },
                { value: "SC", label: "Santa Catarina" },
                { value: "SP", label: "São Paulo" }
            ];

            return res.json({
                success: true,
                data: estados
            });
        }

    } catch (error) {
        console.error('Erro ao buscar estados:', error);

        // Fallback em caso de erro
        const estados = [
            { value: "PR", label: "Paraná" },
            { value: "SC", label: "Santa Catarina" },
            { value: "SP", label: "São Paulo" }
        ];

        return res.json({
            success: true,
            data: estados
        });
    }
});

// Rota para cidades por estado
router.get('/cidades/:estado?', async (req, res) => {
    try {
        const { estado } = req.params;

        let query = `
      SELECT CD_CIDADE, NOME, UF, CD_SITUACAO
      FROM CIDADE
      WHERE 1=1`;

        const params = [];

        if (estado) {
            query += ` AND UF = ?`;
            params.push(estado);
        }

        query += ` ORDER BY NOME`;

        const result = await executeQuery(query, params);

        if (result && result.length > 0) {
            return res.json({
                success: true,
                data: result
            });
        } else {
            // Fallback para dados fixos
            const cidades = [
                { value: "arapongas", label: "Arapongas" },
                { value: "apucarana", label: "Apucarana" },
                { value: "guarapuava", label: "Guarapuava" }
            ];

            return res.json({
                success: true,
                data: estado ? cidades.filter(cidade => cidade.value.includes(estado.toLowerCase())) : cidades
            });
        }

    } catch (error) {
        console.error('Erro ao buscar cidades:', error);

        const cidades = [
            { value: "arapongas", label: "Arapongas" },
            { value: "apucarana", label: "Apucarana" },
            { value: "guarapuava", label: "Guarapuava" }
        ];

        return res.json({
            success: true,
            data: cidades
        });
    }
});

export default router;