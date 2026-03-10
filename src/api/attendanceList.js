import { Router } from "express";
import { executeQuery } from "../config/database.js";

const router = Router();

// 1. Buscar membros de um GC específico para montar a lista
router.get("/members/:cdIgreja/:cdGc", async (req, res) => {
    try {
        const { cdIgreja, cdGc } = req.params;

        // Busca membros vinculados ao GC ou que pertençam à mesma igreja
        const query = `
      SELECT 
        CD_MEMBRO as ID, 
        NOME, 
        'Ativo' as SITUACAO 
      FROM MEMBRO 
      WHERE CD_IGREJA = ? 
      AND CD_SITUACAO = 1
      ORDER BY NOME
    `;
        // Nota: Ajuste o WHERE conforme sua regra de quem deve aparecer na lista do GC

        const result = await executeQuery(query, [cdIgreja]);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao carregar membros", detalhes: error.message });
    }
});

// 2. Buscar presenças já gravadas em uma data específica
router.get("/history", async (req, res) => {
    try {
        const { cdIgreja, cdGc, data } = req.query; // Ex: ?cdIgreja=1&cdGc=2&data=2026-03-10

        const query = `
      SELECT CD_MEMBRO, FL_PRESENCA 
      FROM LISTA_FREQUENCIA 
      WHERE CD_IGREJA = ? AND CD_GC = ? AND CAST(DT_EVENTO AS DATE) = ?
    `;

        const result = await executeQuery(query, [cdIgreja, cdGc, data]);
        return res.json(result);
    } catch (error) {
        return res.status(500).json({ erro: "Erro ao buscar histórico", detalhes: error.message });
    }
});

// 3. Salvar Presenças (POST)
router.post("/", async (req, res) => {
    const { CD_IGREJA, CD_GC, DT_EVENTO, PRESENCAS } = req.body;
    // PRESENCAS deve ser um array: [{ CD_MEMBRO: 1, FL_PRESENCA: 'S' }, ...]

    if (!PRESENCAS || !Array.isArray(PRESENCAS)) {
        return res.status(400).json({ erro: "Dados de presença inválidos" });
    }

    try {
        // No Firebird, para salvar múltiplos registros, vamos iterar. 
        // Em produção, o ideal é usar uma Transaction para garantir que salve tudo ou nada.
        for (const p of PRESENCAS) {
            const query = `
        UPDATE OR INSERT INTO LISTA_FREQUENCIA (
          CD_IGREJA, CD_GC, CD_MEMBRO, DT_EVENTO, FL_PRESENCA
        ) VALUES (?, ?, ?, ?, ?)
        MATCHING (CD_IGREJA, CD_GC, CD_MEMBRO, DT_EVENTO)
      `;

            await executeQuery(query, [
                CD_IGREJA,
                CD_GC,
                p.CD_MEMBRO,
                DT_EVENTO,
                p.FL_PRESENCA // 'S' para presente, 'N' para ausente
            ]);
        }

        return res.json({ success: true, message: "Frequência salva com sucesso!" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ erro: "Falha ao salvar lista", detalhes: error.message });
    }
});

export default router;