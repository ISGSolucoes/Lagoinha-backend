// test-connection.js
import { executeQuery } from "../config/database.js";

async function testConnection() {
  try {
    console.log("Testando conexão com Firebird...");
    
    // Teste simples
    const result = await executeQuery("SELECT 1 AS TEST FROM RDB$DATABASE");
    console.log("✅ Conexão bem-sucedida:", result);
    
    // Teste de consulta na tabela usuario
    const users = await executeQuery("SELECT COUNT(*) AS TOTAL FROM USUARIO");
    console.log("✅ Tabela USUARIO encontrada:", users);
    
  } catch (error) {
    console.error("❌ Erro na conexão:", error.message);
    console.error("Stack:", error.stack);
  }
}

testConnection();

// para testar  a conexaoo execute: node test-connection.js