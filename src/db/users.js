import { executeQuery } from "../config/database.js";


/*
 Tabela USUARIO:

 CD_USUARIO (auto pelo trigger)
 NOME
 CPF
 ENDERECO
 NRO
 BAIRRO
 CD_CIDADE (OBRIGATÓRIO)
 CEP
 CD_SITUACAO (OBRIGATÓRIO)
 CELULAR
 EMAIL
 SENHA
 CD_TIPO
 CD_IGREJA_ATUAL
 CD_IGREJA
*/

// Helpers simples (iniciante-friendly)
function isNullOrUndefined(v) {
  return v === null || v === undefined;
}

function toNumberOrError(value, fieldName) {
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`${fieldName} precisa ser número`);
  }
  return n;
}

// ============================
// CADASTRAR USUÁRIO
// ============================
export async function cadastrarUsuario(dados) {
  const {
    nome,
    email,
    senha,
    cd_cidade,
    cd_situacao,
    cd_tipo = 1,
    cpf = null,
    endereco = null,
    nro = null,
    bairro = null,
    cep = null,
    celular = null,
    cd_igreja_atual = null,
    cd_igreja
  } = dados || {};

  // validações básicas
  if (!nome || !email || !senha) {
    throw new Error("nome, email e senha são obrigatórios");
  }

  if (
    isNullOrUndefined(cd_cidade) ||
    isNullOrUndefined(cd_situacao) ||
    isNullOrUndefined(cd_igreja)
  ) {
    throw new Error("cd_cidade, cd_situacao e cd_igreja são obrigatórios");
  }

  // conversões numéricas
  const cdCidadeNum = toNumberOrError(cd_cidade, "cd_cidade");
  const cdSituacaoNum = toNumberOrError(cd_situacao, "cd_situacao");
  const cdTipoNum = toNumberOrError(cd_tipo, "cd_tipo");
  const cdIgrejaNum = toNumberOrError(cd_igreja, "cd_igreja");

  // INSERT (sem RETURNING)
  const sqlInsert = `
    INSERT INTO USUARIO (
      NOME,
      EMAIL,
      SENHA,
      CD_CIDADE,
      CD_SITUACAO,
      CD_TIPO,
      CPF,
      ENDERECO,
      NRO,
      BAIRRO,
      CEP,
      CELULAR,
      CD_IGREJA_ATUAL,
      CD_IGREJA
    )
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `;

  const params = [
    nome,
    email,
    senha,
    cdCidadeNum,
    cdSituacaoNum,
    cdTipoNum,
    cpf,
    endereco,
    nro,
    bairro,
    cep,
    celular,
    cd_igreja_atual,
    cdIgrejaNum
  ];

  await executeQuery(sqlInsert, params);

  // buscar ID após insert
  const sqlBusca = `SELECT CD_USUARIO FROM USUARIO WHERE EMAIL = ?`;
  const resBusca = await executeQuery(sqlBusca, [email]);

  const cdUsuario =
    resBusca && resBusca[0] && (resBusca[0].CD_USUARIO ?? resBusca[0].cd_usuario);

  if (!cdUsuario) {
    throw new Error("Usuário inserido, mas não consegui localizar o CD_USUARIO.");
  }

  return {
    sucesso: true,
    cd_usuario: cdUsuario
  };
}

// ============================
// LOGIN
// ============================
export async function loginUsuario({ email, senha }) {
  if (!email || !senha) {
    throw new Error("email e senha são obrigatórios");
  }

  const sql = `
    SELECT
      CD_USUARIO,
      NOME,
      EMAIL,
      CD_TIPO,
      CD_SITUACAO,
      CD_CIDADE,
      CD_IGREJA_ATUAL,
      CD_IGREJA
    FROM USUARIO
    WHERE EMAIL = ?
      AND SENHA = ?
  `;

  const res = await executeQuery(sql, [email, senha]);

  if (!res || res.length === 0) return null;

  return res[0];
}

// ============================
// PERFIL
// ============================
export async function buscarUsuarioPorEmail(email) {
  if (!email) {
    throw new Error("email é obrigatório");
  }

  const sql = `
    SELECT
      CD_USUARIO,
      NOME,
      EMAIL,
      CD_TIPO,
      CD_SITUACAO,
      CD_CIDADE,
      CPF,
      ENDERECO,
      NRO,
      BAIRRO,
      CEP,
      CELULAR,
      CD_IGREJA_ATUAL,
      CD_IGREJA
    FROM USUARIO
    WHERE EMAIL = ?
  `;

  const res = await executeQuery(sql, [email]);

  if (!res || res.length === 0) return null;

  return res[0];
}
