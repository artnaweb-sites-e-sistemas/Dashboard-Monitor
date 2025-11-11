/**
 * Script para limpar o cache de rate limiting (útil em desenvolvimento)
 * 
 * Este script não é necessário se o rate limiting estiver desabilitado
 * para IPs locais, mas pode ser útil para testes.
 */

console.log('========================================');
console.log('Limpar Cache de Rate Limiting');
console.log('========================================');
console.log('');
console.log('NOTA: O rate limiting está configurado para pular');
console.log('requisições de IPs locais em desenvolvimento.');
console.log('');
console.log('Se você ainda está recebendo erros 429:');
console.log('1. Reinicie o backend (Ctrl+C e depois npm start)');
console.log('2. Verifique se NODE_ENV não está definido como "production"');
console.log('3. Verifique se o IP da requisição é local (127.0.0.1)');
console.log('');
console.log('========================================');
console.log('Para reiniciar o backend:');
console.log('  cd backend');
console.log('  npm start');
console.log('========================================');


