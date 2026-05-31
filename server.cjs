/**
 * iisnode uses require() to load the entry point. 
 * Since this project uses ES Modules ("type": "module"), 
 * we need this CommonJS wrapper to dynamically import the ESM server.
 */

// Silenciar aviso de obsolescência DEP0005 (Buffer() is deprecated)
// Isso evita que o log do IIS fique poluído com avisos vindos de dependências externas.
const originalEmitWarning = process.emitWarning;
process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('DEP0005')) return;
    if (args[0] === 'DEP0005' || (args[1] && args[1].code === 'DEP0005')) return;
    return originalEmitWarning(warning, ...args);
};

(async () => {
    try {
        await import('./src/server.js');
    } catch (err) {
        console.error('Failed to load ESM server:', err);
        process.exit(1);
    }
})();
