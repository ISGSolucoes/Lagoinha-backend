// src/config/firebird-native.js
import { createNativeClient } from "node-firebird-driver-native";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", "..", ".env");
dotenv.config({ path: envPath });

export async function executeQuery(sql, params = []) {
  const client = createNativeClient({
    host: process.env.DATABASE_HOST || "127.0.0.1",
    port: 3050,
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,

    // 👇 IMPORTANTE: aponta explicitamente o fbclient.dll (evita erro aleatório de PATH)
    // Ajuste o caminho se o seu Firebird estiver em outra pasta
    libraryFilename: "C:\\Program Files (x86)\\Firebird\\Firebird_3_0\\fbclient.dll",
  });

  const db = await client.connect();

  try {
    const result = await db.query(sql, params);
    return result;
  } finally {
    await db.disconnect();
  }
}
