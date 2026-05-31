import os from 'os';

/**
 * Patch para evitar o erro ENOMEM em os.userInfo() no Windows.
 * Algumas bibliotecas como node-firebird chamam os.userInfo() internamente.
 * Se o processo estiver rodando em um ambiente restrito (como IIS), 
 * essa chamada pode falhar catastroficamente.
 */
const originalUserInfo = os.userInfo;

os.userInfo = function(options) {
    try {
        return originalUserInfo.call(os, options);
    } catch (error) {
        // Se for o erro ENOMEM ou similar no Windows, retornamos um mock
        if (error.code === 'ERR_SYSTEM_ERROR' || error.message.includes('ENOMEM')) {
            console.warn('[PATCH] Interceptado erro ENOMEM em os.userInfo(). Fornecendo fallback.');
            return {
                username: process.env.USERNAME || process.env.USER || 'firebird_user',
                uid: -1,
                gid: -1,
                shell: null,
                homedir: process.env.USERPROFILE || process.env.HOME || '/tmp'
            };
        }
        // Se for outro erro, lançamos novamente
        throw error;
    }
};

console.log('✅ Patch para os.userInfo() aplicado com sucesso.');
