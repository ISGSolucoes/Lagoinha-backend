// src/db/auth.js
import express from "express";
import * as users from "./users.js";

const router = express.Router();

/**
 * POST /auth/cadastro
 * Body esperado (mínimo):
 * {
 *   "nome": "Fulano",
 *   "email": "fulano@teste.com",
 *   "senha": "123456",
 *   "cd_cidade": 1,
 *   "cd_situacao": 1,
 *   "cd_tipo": 1 (opcional)
 * }
 */
router.post("/cadastro", async (req, res) => {
  try {
    // logs úteis para iniciante (pode remover depois)
    console.log("CONTENT-TYPE =>", req.headers["content-type"]);
    console.log("BODY RECEBIDO =>", req.body);

    const dados = req.body || {};

    // validação básica
    if (!dados.nome || !dados.email || !dados.senha) {
      return res.status(400).json({
        erro: "Campos obrigatórios: nome, email, senha",
      });
    }

    // obrigatórios do banco
if (
  dados.cd_cidade === null || 
  dados.cd_cidade === undefined ||
  dados.cd_situacao === null || 
  dados.cd_situacao === undefined ||
  dados.cd_igreja === null ||
  dados.cd_igreja === undefined
) {
  return res.status(400).json({
    erro: "Campos obrigatórios: cd_cidade, cd_situacao, cd_igreja",
  });
}


    // default cd_tipo
    if (dados.cd_tipo === null || dados.cd_tipo === undefined) {
      dados.cd_tipo = 1;
    }

    // garante que a função existe
    if (typeof users.cadastrarUsuario !== "function") {
      return res.status(500).json({
        erro: "Falha ao cadastrar",
        detalhes:
          "Função users.cadastrarUsuario não encontrada. Verifique o arquivo src/db/users.js (export).",
      });
    }

    // ✅ passa o body inteiro (inclui cd_cidade e cd_situacao)
    const resultado = await users.cadastrarUsuario(dados);

    return res.status(201).json(resultado);
  } catch (error) {
    console.error("Erro no cadastro:", error);
    return res.status(500).json({
      erro: "Falha ao cadastrar",
      detalhes: error.message,
    });
  }
});

/**
 * POST /auth/login
 * Body esperado:
 * {
 *   "email": "fulano@teste.com",
 *   "senha": "123456"
 * }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, senha } = req.body || {};

    console.log("email", email);
    console.log("senha", senha);

    if (!email || !senha) {
      return res.status(400).json({
        erro: "Campos obrigatórios: email, senha",
      });
    }

    // usa loginUsuario do users.js
    if (typeof users.loginUsuario === "function") {
      const resultado = await users.loginUsuario({ email, senha });

      if (!resultado) {
        return res.status(401).json({ erro: "Email ou senha inválidos" });
      }

      // segurança: nunca devolver senha
      const usuarioSeguro = { ...resultado };
      delete usuarioSeguro.senha;
      delete usuarioSeguro.SENHA;
      delete usuarioSeguro.password;
      delete usuarioSeguro.PASSWORD;
      delete usuarioSeguro.password_hash;
      delete usuarioSeguro.PASSWORD_HASH;

      return res.status(200).json(usuarioSeguro);
    }

    return res.status(500).json({
      erro: "Falha no login",
      detalhes:
        "Função users.loginUsuario não encontrada. Crie/exporte em src/db/users.js.",
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      erro: "Falha no login",
      detalhes: error.message,
    });
  }
});

/**
 * GET /auth/perfil?email=...
 * (modo simples para iniciante — depois evoluímos para token)
 */
router.get("/perfil", async (req, res) => {
  try {
    const email = req.query.email;

    if (!email) {
      return res.status(400).json({
        erro: "Informe o email na query: /auth/perfil?email=...",
      });
    }

    if (typeof users.buscarUsuarioPorEmail !== "function") {
      return res.status(500).json({
        erro: "Falha ao buscar perfil",
        detalhes:
          "Função users.buscarUsuarioPorEmail não encontrada. Crie/exporte em src/db/users.js.",
      });
    }

    const usuario = await users.buscarUsuarioPorEmail(email);

    if (!usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    // segurança: nunca devolver senha/senha_hash
    const usuarioSeguro = { ...usuario };
    delete usuarioSeguro.senha;
    delete usuarioSeguro.SENHA;
    delete usuarioSeguro.password;
    delete usuarioSeguro.PASSWORD;
    delete usuarioSeguro.password_hash;
    delete usuarioSeguro.PASSWORD_HASH;

    return res.status(200).json(usuarioSeguro);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return res.status(500).json({
      erro: "Falha ao buscar perfil",
      detalhes: error.message,
    });
  }
});

export default router;
