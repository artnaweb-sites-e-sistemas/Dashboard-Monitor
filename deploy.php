<?php
/**
 * Script de Deploy via Webhook do GitHub
 * 
 * Coloque este arquivo em um diretório acessível via web no cPanel
 * Configure o webhook do GitHub para apontar para: https://seudominio.com/deploy.php
 * 
 * IMPORTANTE: Adicione autenticação básica ou token para segurança!
 */

// Configurações de segurança
$WEBHOOK_SECRET = 'SEU_SECRET_AQUI'; // Altere para um valor seguro
$PROJECT_DIR = '/home/usuario/artnaweb-monitor'; // Ajuste o caminho
$LOG_FILE = '/home/usuario/artnaweb-monitor/deploy.log';

// Função para log
function logMessage($message) {
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    file_put_contents($LOG_FILE, "[$timestamp] $message\n", FILE_APPEND);
}

// Verificar se é uma requisição POST do GitHub
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die('Method not allowed');
}

// Verificar o secret (se configurado)
if (isset($_GET['secret']) && $_GET['secret'] === $WEBHOOK_SECRET) {
    // Secret válido
} else {
    // Se não usar secret, pelo menos verificar User-Agent do GitHub
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    if (strpos($userAgent, 'GitHub-Hookshot') === false) {
        http_response_code(403);
        die('Forbidden');
    }
}

// Verificar se o payload é do GitHub
$payload = file_get_contents('php://input');
$data = json_decode($payload, true);

// Verificar se é push para branch main
if (isset($data['ref']) && $data['ref'] === 'refs/heads/main') {
    logMessage('Deploy iniciado via webhook do GitHub');
    
    // Executar deploy
    $output = [];
    $return_var = 0;
    
    // Comandos para deploy
    $commands = [
        "cd $PROJECT_DIR && git pull origin main",
        "cd $PROJECT_DIR/backend && npm install --production",
        "cd $PROJECT_DIR/frontend && npm install && npm run build"
    ];
    
    foreach ($commands as $command) {
        exec($command . ' 2>&1', $output, $return_var);
        logMessage("Executado: $command");
        logMessage("Output: " . implode("\n", $output));
        
        if ($return_var !== 0) {
            logMessage("ERRO: Comando falhou com código $return_var");
            http_response_code(500);
            die('Deploy failed');
        }
    }
    
    logMessage('Deploy concluído com sucesso');
    http_response_code(200);
    echo json_encode(['status' => 'success', 'message' => 'Deploy realizado com sucesso']);
} else {
    logMessage('Push ignorado (não é branch main)');
    http_response_code(200);
    echo json_encode(['status' => 'ignored', 'message' => 'Push não é para branch main']);
}

