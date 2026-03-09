import express from "express";
import bcrypt from "bcryptjs";
import { criptografar, descriptografar } from "../config/criptografia.js";
import { executeQuery } from "../config/database.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

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

function isBcryptHash(value) {
  const senha = String(value || "").trim();
  return (
    senha.startsWith("$2a$") ||
    senha.startsWith("$2b$") ||
    senha.startsWith("$2y$")
  );
}

function tentarDescriptografarSenhaLegada(valor) {
  try {
    return String(descriptografar(valor) || "").trim();
  } catch (error) {
    return null;
  }
}

async function migrarSenhaParaBcrypt(cdUsuario, senhaPura) {
  const senhaHash = await bcrypt.hash(String(senhaPura || "").trim(), 10);

  await executeQuery(
    `
      UPDATE usuario
      SET senha = ?
      WHERE cd_usuario = ?
    `,
    [senhaHash, cdUsuario]
  );

  console.log(`[LOGIN] Senha do usuário ${cdUsuario} migrada para bcrypt`);
}

export const cadastrarUsuario = async (dados) => {
  try {
    const {
      nome,
      cpf,
      email,
      senha,
      cd_tipo,
      cd_igreja,
      endereco,
      nro,
      bairro,
      cd_cidade,
      cep,
      cd_situacao,
      celular,
      cd_igreja_atual,
    } = dados;

    const queryMaxCd = `
      SELECT COALESCE(MAX(cd_usuario), 0) + 1 AS new_cd_usuario
      FROM usuario
      WHERE cd_igreja = ?
    `;

    const maxResult = await executeQuery(queryMaxCd, [cd_igreja]);
    const newCdUsuario = maxResult[0].NEW_CD_USUARIO;

    console.log("cd_usuario:", newCdUsuario);

    // ✅ NOVO PADRÃO: bcrypt
    const senhaHash = await bcrypt.hash(String(senha || "").trim(), 10);

    const ssql = `
      INSERT INTO usuario
      (
        cd_usuario,
        nome,
        cpf,
        endereco,
        nro,
        bairro,
        cd_cidade,
        cep,
        cd_situacao,
        celular,
        email,
        cd_tipo,
        cd_igreja_atual,
        cd_igreja,
        senha
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      newCdUsuario,
      nome,
      cpf,
      endereco,
      nro,
      bairro,
      cd_cidade,
      cep,
      cd_situacao,
      celular,
      email,
      cd_tipo,
      cd_igreja_atual,
      cd_igreja,
      senhaHash,
    ];

    await executeQuery(ssql, params);

    return {
      success: true,
      cd_usuario: newCdUsuario,
      mensagem: "Usuário cadastrado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    throw error;
  }
};

export const verificarCredenciais = async (email, senha) => {
  try {
    const emailNormalizado = String(email || "").trim();
    const senhaInformada = String(senha || "").trim();

    const query = `
      SELECT
        cd_usuario,
        nome,
        cpf,
        email,
        senha,
        cd_tipo
      FROM usuario
      WHERE UPPER(TRIM(email)) = UPPER(TRIM(?))
    `;

    const params = [emailNormalizado];
    const results = await executeQuery(query, params);

    console.log("[LOGIN] Email recebido:", emailNormalizado);
    console.log("[LOGIN] Usuários encontrados:", results?.length || 0);

    if (!results || results.length === 0) {
      return null;
    }

    const user = results[0];
    const senhaBanco = String(user.SENHA || "").trim();

    let senhaValida = false;
    let formatoSenha = "desconhecido";

    // 1) bcrypt
    if (isBcryptHash(senhaBanco)) {
      senhaValida = await bcrypt.compare(senhaInformada, senhaBanco);
      formatoSenha = "bcrypt";
    }

    // 2) criptografia legada
    if (!senhaValida) {
      const senhaLegada = tentarDescriptografarSenhaLegada(senhaBanco);

      if (senhaLegada !== null) {
        console.log("[LOGIN] Senha informada length:", senhaInformada.length);
        console.log("[LOGIN] Senha banco length:", senhaLegada.length);

        if (senhaInformada === senhaLegada) {
          senhaValida = true;
          formatoSenha = "legado_criptografado";
        }
      }
    }

    // 3) texto puro legado
    if (!senhaValida && senhaInformada === senhaBanco) {
      senhaValida = true;
      formatoSenha = "texto_puro";
    }

    if (!senhaValida) {
      console.log("[LOGIN] Falha de autenticação. Formato testado:", formatoSenha);
      return null;
    }

    console.log("[LOGIN] Login válido. Formato encontrado:", formatoSenha);

    // ✅ Migra automaticamente para bcrypt se entrar por formato antigo
    if (formatoSenha !== "bcrypt") {
      await migrarSenhaParaBcrypt(user.CD_USUARIO, senhaInformada);
    }

    return {
      id: user.CD_USUARIO,
      cd_usuario: user.CD_USUARIO,
      nome: user.NOME,
      email: user.EMAIL,
      tipo: user.CD_TIPO,
    };
  } catch (error) {
    console.error("Erro ao verificar credenciais:", error);
    return null;
  }
};

router.get("/list", async function (req, res) {
  let ssql =
    "SELECT celular, nome, email, senha, cd_igreja_atual, cd_tipo FROM usuario WHERE cd_igreja > 0";
  const filtro = [];

  if (req.query.church) {
    ssql += " AND cd_igreja = ?";
    filtro.push(req.query.church);
  }

  if (req.query.email) {
    ssql += " AND email = ?";
    filtro.push(req.query.email);
    console.log(`Filtrando por email: ${req.query.email}`);
  }

  try {
    const users = await executeQuery(ssql, filtro);

    if (!users || users.length === 0) {
      res.status(404).send("Nenhum usuário encontrado");
      return;
    }

    console.log("Resultados encontrados:", users.length || 0);
    res.status(200).json(users);
  } catch (err) {
    console.error("Erro na rota /list:", err.message);
    res.status(500).send("Erro ao consultar usuários: " + err.message);
  }
});

router.post("/postuser", async function (req, res) {
  try {
    const queryMaxCd = `
      SELECT COALESCE(MAX(cd_usuario), 0) + 1 AS new_cd_usuario
      FROM usuario
      WHERE cd_igreja = ?
    `;

    const maxResult = await executeQuery(queryMaxCd, [req.body.cd_igreja]);
    const newCdUsuario = maxResult[0].NEW_CD_USUARIO;

    // ✅ NOVO PADRÃO: bcrypt
    const senhaHash = await bcrypt.hash(String(req.body.senha || "").trim(), 10);

    const ssql = `
      INSERT INTO usuario
      (
        cd_usuario,
        nome,
        cpf,
        endereco,
        nro,
        bairro,
        cd_cidade,
        cep,
        cd_situacao,
        celular,
        email,
        cd_tipo,
        cd_igreja_atual,
        cd_igreja,
        senha
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      newCdUsuario,
      req.body.nome,
      req.body.cpf,
      req.body.endereco,
      req.body.nro,
      req.body.bairro,
      req.body.cd_cidade,
      req.body.cep,
      req.body.cd_situacao,
      req.body.celular,
      req.body.email,
      req.body.cd_tipo,
      req.body.cd_igreja_atual,
      req.body.cd_igreja,
      senhaHash,
    ];

    await executeQuery(ssql, params);
    res.status(201).json({ cd_usuario: newCdUsuario });
  } catch (err) {
    console.error("Erro no postuser:", err);
    res.status(500).send("Erro ao inserir usuário: " + err.message);
  }
});

// Rota de login com JWT
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        erro: "Credenciais incompletas",
        detalhes: "Email e senha são obrigatórios",
      });
    }

    const user = await verificarCredenciais(email, password);

    if (!user) {
      return res.status(401).json({
        success: false,
        erro: "Credenciais inválidas",
        detalhes: "Usuário não encontrado ou senha incorreta",
      });
    }

    const token = gerarTokenJWT(user.id, user.tipo);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        tipo: user.tipo,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({
      erro: "Erro interno no servidor",
      detalhes: error.message,
    });
  }
});

export const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        erro: "Token inválido ou expirado",
        detalhes: err.message,
      });
    }

    req.user = user;
    next();
  });
};

export const verificarToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ erro: "Token inválido ou expirado" });
    }

    req.userId = decoded.sub;
    req.userType = decoded.tipo;
    next();
  });
};

router.get("/perfil", authenticateJWT, async (req, res) => {
  try {
    const userData = await executeQuery(
      `
      SELECT nome, email, cd_tipo
      FROM usuario
      WHERE cd_usuario = ?
      `,
      [req.user.sub]
    );

    res.json(userData[0]);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao buscar perfil" });
  }
});

router.get("/protegida", verificarToken, (req, res) => {
  res.json({
    mensagem: "Rota protegida acessada com sucesso!",
    userId: req.userId,
    userType: req.userType,
  });
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