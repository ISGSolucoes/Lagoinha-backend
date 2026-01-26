import { Router } from 'express';
import { cadastrarUsuario, verificarCredenciais } from './users.js';
import members from './members.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config(); // Esta linha é essencial para carregar as variáveis

const router = Router();

// Função para gerar token JWT (consistente com a do users.js)
const gerarTokenJWT = (userId, userType) => {
    console.log(process.env.JWT_SECRET); // Deve mostrar sua chave
    if (!process.env.JWT_SECRET) {
        throw new Error('Chave JWT_SECRET não configurada no .env');
    }

    return jwt.sign(
        {
            sub: userId,
            tipo: userType,
            iat: Math.floor(Date.now() / 1000)
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
}

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                erro: 'Credenciais incompletas',
                detalhes: 'Email e senha são obrigatórios'
            });
        }

        // 1. Verifica as credenciais
        const user = await verificarCredenciais(email, password);
        console.log('DAdos login: ', user)
        
        if (!user) {
            return res.status(401).json({
                success: false,
                erro: 'Credenciais inválidas',
                detalhes: 'Usuário não encontrado ou senha incorreta'
            });
        }

        // 2. Gera o token JWT (agora incluindo o tipo do usuário)
        const token = gerarTokenJWT(user.id, user.tipo);

        // 3. Retorna os dados
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                name: user.nome,
                email: user.email,
                tipo: user.cd_tipo
            }
        });

    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({
            success: false,
            erro: 'Falha no login',
            detalhes: error.message
        });
    }
})

router.post('/cadastro', async (req, res) => {
    try {
        const { cd_tipo, ...dados } = req.body;

        console.log(req.body)

        if (cd_tipo !== null && cd_tipo !== undefined) {
            if (cadastrarUsuario) {
                const resultado = await cadastrarUsuario({ ...dados, cd_tipo });
                return res.status(201).json(resultado);
            } else {
                throw new Error('Função cadastrarUsuario não disponível');
            }
        } else {
            if (members.cadastrarMembro) {
                const resultado = await members.cadastrarMembro(dados);
                return res.status(201).json(resultado);
            } else {
                throw new Error('Função cadastrarMembro não disponível');
            }
        }
    } catch (error) {
        console.error('Erro no cadastro:', error);
        return res.status(500).json({
            erro: 'Falha ao cadastrar',
            detalhes: error.message
        });
    }
})

export default router;