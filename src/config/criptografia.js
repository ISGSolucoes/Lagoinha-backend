// Função para CRIPTOGRAFAR senhas (nova)
export function criptografar(senhaOriginal) {
  if (!senhaOriginal) return "";

  // Passo 1: Adiciona o tamanho da senha (3 dígitos)
  const nTamanhoSenha = senhaOriginal.length.toString().padStart(3, '0');
  let senhaProcessada = nTamanhoSenha + senhaOriginal;

  // Passo 2: Aplica a criptografia básica (inverso da descriptografia)
  senhaProcessada = criptografarSenha(senhaProcessada, 10); // Usando a mesma chave (10)

  // Passo 3: Codifica para UTF-8 (opcional, se necessário para compatibilidade)
  const encoder = new TextEncoder();
  const byteArray = encoder.encode(senhaProcessada);

  // Passo 4: Converte para Base64 (facilita armazenamento)
  const senhaCriptografada = Buffer.from(byteArray).toString('base64');

  return senhaCriptografada;
}

// Função auxiliar de criptografia/descriptografia (privada)
function criptografarSenha(dados, chave) {
  let resultado = "";
  for (let i = 0; i < dados.length; i++) {
      // Para CRIPTOGRAFAR: soma a chave
      // Para DESCRIPTOGRAFAR: subtrai a chave (já está implementado)
      const charCode = dados.charCodeAt(i) + chave; // (+) para criptografar
      resultado += String.fromCharCode(charCode);
  }
  return resultado;
}



export function descriptografar(senhaCriptografada) {
  if (!senhaCriptografada) return "";

  // Passo 1: Decodifica Base64 para ArrayBuffer
  const decodedBytes = Buffer.from(senhaCriptografada, 'base64');
  
  // Passo 2: Converte para string UTF-8
  let senhaProcessada = new TextDecoder().decode(decodedBytes);
  
  // Passo 3: Aplica a descriptografia básica (subtrai a chave)
  senhaProcessada = descriptografarSenha(senhaProcessada, 10); // Usando a mesma chave (10)
  
  // Passo 4: Extrai o tamanho e a senha real
  const nTamanhoSenha = parseInt(senhaProcessada.substring(0, 3));
  const senhaFinal = senhaProcessada.substring(3, 3 + nTamanhoSenha);
  
  return senhaFinal;
}

// Função auxiliar para descriptografar (operação inversa de criptografarSenha)
function descriptografarSenha(dados, chave) {
  let resultado = "";
  for (let i = 0; i < dados.length; i++) {
      const charCode = dados.charCodeAt(i) - chave; // Subtrai a chave para descriptografar
      resultado += String.fromCharCode(charCode);
  }
  return resultado;
}