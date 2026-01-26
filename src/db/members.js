import express from "express"
//import { executeQuery } from "../config/database.js"
import { executeQuery, db } from "../config/database.js";

const clients = express.Router();

export const cadastrarMembro = async (dados) => {
  const { nome, cpf, email, senha, igreja } = dados;
  
  const query = `
    INSERT INTO MEMBROS (
      NOME, CPF, EMAIL, SENHA, IGREJA, 
      DATA_CADASTRO, STATUS
    ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, 'ATIVO')
    RETURNING ID
  `;

  return new Promise((resolve, reject) => {
    db.execute(query, [nome, cpf, email, senha, igreja], (err, result) => {
      if (err) return reject(err);
      resolve({ id: result[0].ID, mensagem: 'Membro cadastrado com sucesso' });
    });
  });
};

// Rota para obter clientes
clients.get("/list", function(req, res) {
    let ssql = `SELECT cod_cliente, decode(coalesce(tipo_pessoa,'F'),'F',nome,'J',razao_social) nome_cliente, 
                       decode(coalesce(tipo_pessoa,'F'),'F',cpf,'J',cnpj) cpf_cnpj 
                  FROM clientes WHERE situacao = 'A'`;
    let filtro = [];

    if (req.query.enterprise) {
        ssql += ' and cod_empresa = ?'
        filtro.push(req.query.enterprise)
    }

    if (req.query.customer_name) {
        ssql += ` AND decode(coalesce(tipo_pessoa,''F''),''F'',nome,''J'',razao_social) LIKE ?`;
        filtro.push(`%${req.query.customer_name}%`);
    }

    executeQuery(ssql, filtro, function(err, result) {
        if (err) {
            res.status(500).send('Erro ao consultar clientes: ' + err);
        } else {
            res.status(200).json(result);
        }
    });
});

export default clients;

