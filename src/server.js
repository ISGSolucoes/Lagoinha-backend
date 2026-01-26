import express from "express"
import cors from "cors"
import routes from "./api/routes.js"
import auth from './db/auth.js';

const app = express()
const port = process.env.PORT || 5000; // Usando a variável de ambiente PORT, se disponível


//Middleare JSON
app.use(express.json())
app.use(cors())

//app.use(routes)
app.use('/api', routes);
app.use('/auth', auth); // Rotas de autenticação separadas

//Rotas
app.get("/", function(req, res) {
    res.status(200).send("listando usuários")
})

app.listen(5000, function(){
    console.log(`Backend em execução em http://localhost:${port}`)
})