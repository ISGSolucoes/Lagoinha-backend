import { Router } from "express";
import { cadastrarUsuario, verificarCredenciais } from "./users.js";
import { criptografar, descriptografar } from "../config/criptografia.js";
import members from "./members.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { executeQuery } from "../config/database.js";

dotenv.config();

const router = Router();

// Função para gerar token JWT
const gerarTokenJWT = (userId, userType) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("Chave JWT_SECRET não configurada no .env");
  }

  return jwt.sign(
    {
      sub: userId,
      tipo: userType,
      iat: Math.floor(Date.now() / 1000),
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
};

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        erro: "Credenciais incompletas",
        detalhes: "Email e senha são obrigatórios",
      });
    }

    const user = await verificarCredenciais(email, password);
    console.log("Dados login:", user);

    if (!user) {
      return res.status(401).json({
        success: false,
        erro: "Credenciais inválidas",
        detalhes: "Usuário não encontrado ou senha incorreta",
      });
    }

    // ✅ usa o tipo correto retornado por verificarCredenciais
    const token = gerarTokenJWT(user.id, user.tipo);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.nome,
        email: user.email,
        tipo: user.tipo,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      success: false,
      erro: "Falha no login",
      detalhes: error.message,
    });
  }
});

router.post("/cadastro", async (req, res) => {
  try {
    const { cd_tipo, ...dados } = req.body;

    if (cd_tipo !== null && cd_tipo !== undefined) {
      if (cadastrarUsuario) {
        const resultado = await cadastrarUsuario({ ...dados, cd_tipo });
        return res.status(201).json(resultado);
      }
      throw new Error("Função cadastrarUsuario não disponível");
    }

    if (members.cadastrarMembro) {
      const resultado = await members.cadastrarMembro(dados);
      return res.status(201).json(resultado);
    }

    throw new Error("Função cadastrarMembro não disponível");
  } catch (error) {
    console.error("Erro no cadastro:", error);
    return res.status(500).json({
      erro: "Falha ao cadastrar",
      detalhes: error.message,
    });
  }
});

/**
 * ✅ GET /auth/perfil?email=...
 * Retorna dados do usuário + UF + nome da cidade (DS_CIDADE)
 */
router.get("/perfil", async (req, res) => {
  try {
    const email = String(req.query.email || "").trim();
    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email é obrigatório",
      });
    }

    const query = `
      SELECT
        u.CD_USUARIO,
        u.NOME,
        u.EMAIL,
        u.CPF,
        u.ENDERECO,
        u.NRO,
        u.BAIRRO,
        u.CEP,
        u.CELULAR,
        u.CD_TIPO,
        u.CD_SITUACAO,
        u.CD_CIDADE,
        u.CD_IGREJA_ATUAL,
        u.CD_IGREJA,
        u.UF,
        c.NOME AS DS_CIDADE
      FROM USUARIO u
      LEFT JOIN CIDADE c ON c.CD_CIDADE = u.CD_CIDADE
      WHERE UPPER(TRIM(u.EMAIL)) = UPPER(TRIM(?))
    `;

    const rows = await executeQuery(query, [email]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Usuário não encontrado",
      });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao buscar perfil",
      details: error.message,
    });
  }
});

/**
 * ✅ PUT /auth/perfil
 * body:
 * { email, uf, cd_cidade, cd_igreja_atual }
 */
router.put("/perfil", async (req, res) => {
  try {
    const { email, uf, cd_cidade, cd_igreja_atual } = req.body || {};

    const emailNorm = String(email || "").trim();
    const ufNorm = String(uf || "").trim().toUpperCase();

    if (!emailNorm || !ufNorm || !cd_cidade || !cd_igreja_atual) {
      return res.status(400).json({
        success: false,
        message: "Campos obrigatórios: email, uf, cd_cidade, cd_igreja_atual",
      });
    }

    // valida UF com 2 caracteres
    if (ufNorm.length !== 2) {
      return res.status(400).json({
        success: false,
        message: "UF inválida (deve ter 2 caracteres, ex: PR).",
      });
    }

    await executeQuery(
      `
      UPDATE USUARIO
      SET
        UF = ?,
        CD_CIDADE = ?,
        CD_IGREJA_ATUAL = ?
      WHERE UPPER(TRIM(EMAIL)) = UPPER(TRIM(?))
      `,
      [ufNorm, Number(cd_cidade), Number(cd_igreja_atual), emailNorm]
    );

    return res.json({ success: true, message: "Perfil atualizado com sucesso" });
  } catch (error) {
    console.error("Erro ao salvar perfil:", error);
    return res.status(500).json({
      success: false,
      message: "Erro ao salvar perfil",
      details: error.message,
    });
  }
});

router.get("/criptografar", function (req, res) {
  if (req.query.password) {
    console.log("Password:", req.query.password);
    const senha = criptografar(req.query.password);
    console.log("Senha Criptografada:", senha);

    res.status(200).json(senha);
  } else {
    res.status(400).json({ erro: "Parâmetro password não informado" });
  }
});



router.get("/descriptografar", function (req, res) {
  if (req.query.password) {
    console.log("Password:", req.query.password);
    const senha = descriptografar(req.query.password);
    console.log("Senha Descriptografada:", senha);

    res.status(200).json(senha);
  } else {
    res.status(400).json({ erro: "Parâmetro password não informado" });
  }
});


export default router;