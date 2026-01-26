import firebird from "node-firebird";
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Configura o caminho absoluto para o .env
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '..', '.env');

console.log('📁 Tentando carregar .env de:', envPath);

// Carrega o .env
dotenv.config({ path: envPath });

// DEBUG: Verifica se as variáveis estão carregadas
console.log('🔍 Variáveis carregadas:');
console.log('DATABASE_HOST:', process.env.DATABASE_HOST);
console.log('DATABASE_USER:', process.env.DATABASE_USER);
console.log('DATABASE_NAME:', process.env.DATABASE_NAME);
console.log('DATABASE_PASSWORD:', process.env.DATABASE_PASSWORD ? '***' : 'undefined');



// Configuração robusta com validação
const dbConfig = (() => {
    const requiredEnvVars = ['DATABASE_HOST', 'DATABASE_NAME', 'DATABASE_USER', 'DATABASE_PASSWORD'];
    const missingVars = requiredEnvVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
        throw new Error(`Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
    }

    return {
        host: process.env.DATABASE_HOST,
        port: 3050,
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        lowercase_keys: false,
        role: null,
        pageSize: 4096,
        retryConnection: true,
        maxRetries: 3,
        retryDelay: 2000
    };
})();

// Monitoramento avançado de conexões
const connectionTracker = {
    active: new Set(),
    stats: { total: 0, peak: 0, errors: 0 },
    
    add(conn) {
        this.active.add(conn);
        this.stats.total++;
        this.stats.peak = Math.max(this.stats.peak, this.active.size);
        conn.on('detach', () => this.active.delete(conn));
    },
    
    log() {
        console.log(`[CONN TRACKER] Ativas: ${this.active.size} | Total: ${this.stats.total} | Pico: ${this.stats.peak} | Erros: ${this.stats.errors}`);
    }
};

// Fechamento seguro de recursos
async function releaseResources(db, transaction) {
    const releaseSteps = [
        () => transaction ? new Promise(r => transaction.rollback(r)) : Promise.resolve(),
        () => db ? new Promise(r => db.detach(r)) : Promise.resolve()
    ];

    for (const step of releaseSteps) {
        try {
            await step();
        } catch (err) {
            console.error('Erro ao liberar recurso:', err);
            connectionTracker.stats.errors++;
        }
    }
}

async function executeQuery(ssql, params = [], retryCount = 0) {
    let db = null;
    let transaction = null;

    try {
        // Estabelece conexão
        db = await new Promise((resolve, reject) => {
            firebird.attach(dbConfig, (err, conn) => {
                if (err) return reject(err);
                connectionTracker.add(conn);
                resolve(conn);
            });
        });

        // Inicia transação
        transaction = await new Promise((resolve, reject) => {
            db.transaction(firebird.ISOLATION_READ_COMMITTED, (err, tx) => {
                err ? reject(err) : resolve(tx);
            });
        });

        // Executa query
        const result = await new Promise((resolve, reject) => {
            transaction.query(ssql, params, (err, res) => {
                err ? reject(err) : resolve(res);
            });
        });

        // Commit
        await new Promise((resolve, reject) => {
            transaction.commit(err => err ? reject(err) : resolve());
        });

        return result;

    } catch (err) {
        // Lógica de reconexão para erros de autenticação
        if (err.gdscode === 335544472 && retryCount < dbConfig.maxRetries) {
            console.log(`Tentativa ${retryCount + 1} de reconexão...`);
            await new Promise(r => setTimeout(r, dbConfig.retryDelay));
            return executeQuery(ssql, params, retryCount + 1);
        }

        // Log detalhado do erro
        console.error('Erro na execução da query:', {
            query: ssql,
            params: params,
            error: err.message,
            stack: err.stack
        });
        throw err;

    } finally {
        // Liberação garantida de recursos
        await releaseResources(db, transaction);
    }
}

// Monitoramento periódico
const monitor = setInterval(() => {
    connectionTracker.log();
    
    // Limpeza emergencial se detectar vazamento
    if (connectionTracker.active.size > 5) {
        console.warn('Limpeza emergencial de conexões!');
        connectionTracker.active.forEach(conn => {
            try { conn.detach(); } catch(e) {}
        });
    }
}, 30000);

// Garante limpeza ao encerrar o processo
process.on('beforeExit', () => {
    clearInterval(monitor);
    connectionTracker.active.forEach(conn => {
        try { conn.detach(); } catch(e) {}
    });
});

// Teste automático de conexão ao iniciar
(async () => {
    try {
        const test = await executeQuery("SELECT 1 FROM RDB$DATABASE");
        console.log('Teste de conexão bem-sucedido:', test);
    } catch (err) {
        console.error('Falha no teste de conexão inicial:', err);
        process.exit(1);
    }
})();

export { executeQuery, dbConfig as db};