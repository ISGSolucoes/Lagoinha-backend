// src/server.js
import express from "express";
import cors from "cors";
import routes from "./api/routes.js";
import auth from "./db/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

/**
 * Middleware JSON
 */
app.use(express.json());

/**
 * CORS (para o React rodando em 8080/8081)
 * - Se você usar outra porta no front, adicione aqui.
 */
const allowedOrigins = [
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // permite chamadas sem origin (ex: Postman/PowerShell)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS bloqueado para a origem: ${origin}`));
    },
    credentials: true,
  })
);

// Responde preflight (OPTIONS) para todas as rotas
app.options("*", cors());

/**
 * Rotas principais
 */
app.get("/", (req, res) => {
  res.status(200).send("Backend online ✅");
});

app.use("/api", routes);
app.use("/auth", auth);

/**
 * 404 padrão
 */
app.use((req, res) => {
  res.status(404).json({
    erro: "Rota não encontrada",
    path: req.originalUrl,
    method: req.method,
  });
});

/**
 * Handler de erro (inclui erros de CORS)
 */
app.use((err, req, res, next) => {
  console.error("❌ Erro:", err?.message || err);
  res.status(500).json({
    erro: "Erro interno no servidor",
    detalhes: err?.message || String(err),
  });
});

/**
 * Start do servidor com tratamento de porta em uso
 */
const server = app.listen(PORT, () => {
  console.log(`✅ Backend rodando em http://localhost:${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Porta ${PORT} já está em uso.`);
    console.error("✅ Feche o outro backend OU mate o processo da porta 5000 e rode de novo.");
    process.exit(1);
  }

  console.error("❌ Erro ao subir servidor:", err);
  process.exit(1);
});

