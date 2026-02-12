import { executeQuery } from "./config/database.js";


console.log("1) Começou o teste...");

(async () => {
  try {
    console.log("2) Vou tentar conectar no Firebird...");
    const r = await executeQuery("SELECT 1 FROM RDB$DATABASE");
    console.log("✅ 3) Conectou no Firebird!", r);
  } catch (e) {
    console.log("❌ 4) Deu erro!");
    console.error(e);
  } finally {
    console.log("5) Terminou o teste.");
    process.exit(0);
  }
})();

