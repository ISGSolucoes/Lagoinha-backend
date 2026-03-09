import express from "express";
import cors from "cors";
import routes from "./api/routes.js";
import auth from "./db/auth.js";

const app = express();
const PORT = 3001;

// Middleware JSON
app.use(express.json());
app.use(cors());

// Rotas
app.use("/api", routes);
app.use("/auth", auth);

app.get("/", function (req, res) {
  res.status(200).send("Backend Lagoinha rodando");
});

app.listen(PORT, function () {
  console.log(`Backend em execução em http://localhost:${PORT}`);
});