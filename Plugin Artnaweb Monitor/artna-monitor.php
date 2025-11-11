<?php
/**
 * Plugin Name: Artna Monitor Integration
 * Plugin URI: https://artnaweb.com.br
 * Description: Integração com Artna Monitor para envio de dados do Wordfence.
 * Version: 1.0.2
 * Author: ArtnaWEB
 * Author URI: https://artnaweb.com.br
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: artna-monitor
 * Requires at least: 5.0
 * Requires PHP: 7.4
 */

// Prevenir acesso direto
if (!defined('ABSPATH')) {
    exit;
}

// Evitar redeclaração de constantes
if (!defined('ARTNA_MONITOR_VERSION')) {
    define('ARTNA_MONITOR_VERSION', '1.0.2');
    define('ARTNA_MONITOR_PLUGIN_DIR', plugin_dir_path(__FILE__));
    define('ARTNA_MONITOR_PLUGIN_URL', plugin_dir_url(__FILE__));
    define('ARTNA_MONITOR_PLUGIN_FILE', __FILE__);
}

class Artna_Monitor {
    
    private static $instance = null;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        $this->init_hooks();
    }
    
    private function init_hooks() {
        add_action('rest_api_init', array($this, 'register_rest_routes'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_plugin_action_links'));
    }
    
    public function register_rest_routes() {
        register_rest_route('artna-monitor/v1', '/wordfence-status', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_wordfence_status'),
            'permission_callback' => array($this, 'check_api_key'),
        ));
    }
    
    public function check_api_key($request) {
        $api_key = $request->get_param('api_key');
        
        if (empty($api_key)) {
            return new WP_Error(
                'missing_api_key',
                'API key não fornecida',
                array('status' => 401)
            );
        }
        
        $valid_api_key = get_option('artna_monitor_api_key', '');
        
        if (empty($valid_api_key)) {
            return new WP_Error(
                'api_key_not_configured',
                'API key não configurada. Configure em Configurações → Artna Monitor.',
                array('status' => 500)
            );
        }
        
        if ($api_key !== $valid_api_key) {
            return new WP_Error(
                'invalid_api_key',
                'API key inválida',
                array('status' => 401)
            );
        }
        
        return true;
    }
    
    public function get_wordfence_status($request) {
        // Tentar carregar Wordfence se não estiver carregado
        if (!class_exists('wfConfig')) {
            // Tentar vários caminhos possíveis do Wordfence
            $possible_paths = array(
                WP_PLUGIN_DIR . '/wordfence/wordfence.php',
                WP_PLUGIN_DIR . '/wordfence/lib/wfConfig.php',
                WP_CONTENT_DIR . '/plugins/wordfence/wordfence.php'
            );
            
            foreach ($possible_paths as $path) {
                if (file_exists($path)) {
                    require_once($path);
                    break;
                }
            }
            
            // Tentar carregar via função do WordPress
            if (!class_exists('wfConfig') && function_exists('wordfence')) {
                wordfence();
            }
        }
        
        // Verificar se Wordfence está instalado
        if (!class_exists('wfConfig')) {
            return new WP_Error(
                'wordfence_not_found',
                'Wordfence não está instalado ou não está ativo. Certifique-se de que o plugin Wordfence está instalado e ativado.',
                array('status' => 404)
            );
        }
        
        // Tentar obter instância do Wordfence de várias formas
        $wf_config = null;
        $error_messages = array();
        
        try {
            // Método 1: getInstance() estático
            if (method_exists('wfConfig', 'getInstance')) {
                $wf_config = wfConfig::getInstance();
            }
            // Método 2: Tentar shared() se disponível
            else if (method_exists('wfConfig', 'shared')) {
                $wf_config = wfConfig::shared();
            }
            // Método 3: Tentar singleton() se disponível
            else if (method_exists('wfConfig', 'singleton')) {
                $wf_config = wfConfig::singleton();
            }
            // Método 4: new wfConfig() (pode não funcionar, mas vamos tentar)
            else if (class_exists('wfConfig')) {
                try {
                    $reflection = new ReflectionClass('wfConfig');
                    if ($reflection->isInstantiable()) {
                        $wf_config = new wfConfig();
                    }
                } catch (Exception $e) {
                    $error_messages[] = 'Não foi possível instanciar wfConfig: ' . $e->getMessage();
                }
            }
        } catch (Exception $e) {
            $error_messages[] = 'Exceção ao obter wfConfig: ' . $e->getMessage();
        } catch (Error $e) {
            $error_messages[] = 'Erro fatal ao obter wfConfig: ' . $e->getMessage();
        }
        
        // Se não conseguiu obter instância, retornar erro com detalhes
        if (!$wf_config || !is_object($wf_config)) {
            $error_msg = 'Não foi possível acessar as configurações do Wordfence. ';
            $error_msg .= 'Métodos disponíveis: ' . (method_exists('wfConfig', 'getInstance') ? 'getInstance ' : '') . 
                         (method_exists('wfConfig', 'shared') ? 'shared ' : '') . 
                         (method_exists('wfConfig', 'singleton') ? 'singleton ' : '');
            if (!empty($error_messages)) {
                $error_msg .= 'Erros: ' . implode(', ', $error_messages);
            }
            
            return new WP_Error(
                'wordfence_error',
                $error_msg,
                array('status' => 500)
            );
        }
        
        try {
            // Verificar se o objeto tem o método get
            if (!is_object($wf_config)) {
                return new WP_Error(
                    'wordfence_error',
                    'Não foi possível obter instância do Wordfence',
                    array('status' => 500)
                );
            }
            
            // Verificar se tem método get, senão tentar outras formas
            if (!method_exists($wf_config, 'get')) {
                // Tentar acessar propriedades diretamente
                if (property_exists($wf_config, 'data')) {
                    // Usar propriedade data se disponível
                } else {
                    return new WP_Error(
                        'wordfence_error',
                        'Método get() não disponível no Wordfence. Versão do Wordfence pode ser incompatível.',
                        array('status' => 500)
                    );
                }
            }
            
            // Obter dados básicos
            $scan_completed = 0;
            $scan_running = false;
            $total_files_scanned = 0;
            
            // Tentar obter dados usando método get() se disponível
            if (method_exists($wf_config, 'get')) {
                try {
                    // Tentar várias formas de obter lastScanCompleted
                    $scan_completed = $wf_config->get('lastScanCompleted', 0);
                    if (!$scan_completed || $scan_completed == 0) {
                        $scan_completed = $wf_config->get('scanTime', 0);
                    }
                    if (!$scan_completed || $scan_completed == 0) {
                        $scan_completed = $wf_config->get('lastScanTime', 0);
                    }
                    if (!$scan_completed || $scan_completed == 0) {
                        $scan_completed = $wf_config->get('lastScanCompletedTime', 0);
                    }
                    
                    // Tentar buscar do banco de dados se ainda não encontrou
                    if (!$scan_completed || $scan_completed == 0) {
                        $scan_completed = (int) get_option('wordfence_lastScanCompleted', 0);
                    }
                    if (!$scan_completed || $scan_completed == 0) {
                        $scan_stats = get_option('wordfence_scanStats', array());
                        if (is_array($scan_stats) && isset($scan_stats['lastScanCompleted'])) {
                            $scan_completed = (int) $scan_stats['lastScanCompleted'];
                        }
                    }
                } catch (Exception $e) {
                    $scan_completed = 0;
                }
                
                try {
                    $scan_running = $wf_config->get('scanRunning', false);
                } catch (Exception $e) {
                    $scan_running = false;
                }
                
                try {
                    // Tentar várias formas de obter o total de arquivos escaneados
                    $total_files_scanned = (int) $wf_config->get('scanFilesProcessed', 0);
                    
                    // Se não encontrou, tentar outras chaves
                    if ($total_files_scanned == 0) {
                        $total_files_scanned = (int) $wf_config->get('totalFilesScanned', 0);
                    }
                    if ($total_files_scanned == 0) {
                        $total_files_scanned = (int) $wf_config->get('scanFiles', 0);
                    }
                    if ($total_files_scanned == 0) {
                        $total_files_scanned = (int) $wf_config->get('filesScanned', 0);
                    }
                    if ($total_files_scanned == 0) {
                        $total_files_scanned = (int) $wf_config->get('totalFiles', 0);
                    }
                    
                    // Tentar obter via wfScanEngine se disponível
                    if ($total_files_scanned == 0 && class_exists('wfScanEngine')) {
                        try {
                            if (method_exists('wfScanEngine', 'shared')) {
                                $scan_engine = wfScanEngine::shared();
                                if (is_object($scan_engine)) {
                                    if (method_exists($scan_engine, 'getSummary')) {
                                        $summary = $scan_engine->getSummary();
                                        if (isset($summary['filesProcessed'])) {
                                            $total_files_scanned = (int) $summary['filesProcessed'];
                                        }
                                        // Tentar outras chaves no resumo
                                        if ($total_files_scanned == 0 && isset($summary['totalFiles'])) {
                                            $total_files_scanned = (int) $summary['totalFiles'];
                                        }
                                        if ($total_files_scanned == 0 && isset($summary['files'])) {
                                            $total_files_scanned = (int) $summary['files'];
                                        }
                                    }
                                    // Tentar método getFilesProcessed se disponível
                                    if ($total_files_scanned == 0 && method_exists($scan_engine, 'getFilesProcessed')) {
                                        $total_files_scanned = (int) $scan_engine->getFilesProcessed();
                                    }
                                    // Tentar método getTotalFiles se disponível
                                    if ($total_files_scanned == 0 && method_exists($scan_engine, 'getTotalFiles')) {
                                        $total_files_scanned = (int) $scan_engine->getTotalFiles();
                                    }
                                }
                            }
                        } catch (Exception $e) {
                            // Ignorar erro
                        }
                    }
                    
                    // Tentar obter via wfIssues se disponível (pode ter informações do scan)
                    if ($total_files_scanned == 0 && class_exists('wfIssues')) {
                        try {
                            if (method_exists('wfIssues', 'shared')) {
                                $wf_issues = wfIssues::shared();
                                if (is_object($wf_issues)) {
                                    if (method_exists($wf_issues, 'getScanSummary')) {
                                        $summary = $wf_issues->getScanSummary();
                                        if (isset($summary['filesProcessed'])) {
                                            $total_files_scanned = (int) $summary['filesProcessed'];
                                        }
                                    }
                                    // Tentar método getSummary se disponível
                                    if ($total_files_scanned == 0 && method_exists($wf_issues, 'getSummary')) {
                                        $summary = $wf_issues->getSummary();
                                        if (isset($summary['filesProcessed'])) {
                                            $total_files_scanned = (int) $summary['filesProcessed'];
                                        }
                                    }
                                }
                            }
                        } catch (Exception $e) {
                            // Ignorar erro
                        }
                    }
                    
                    // Última tentativa: buscar diretamente do banco de dados do WordPress
                    if ($total_files_scanned == 0) {
                        global $wpdb;
                        try {
                            // Wordfence armazena estatísticas em opções do WordPress
                            $scan_stats = get_option('wordfence_scanStats', array());
                            if (is_array($scan_stats) && isset($scan_stats['filesProcessed'])) {
                                $total_files_scanned = (int) $scan_stats['filesProcessed'];
                            }
                            // Tentar outras opções
                            if ($total_files_scanned == 0) {
                                $total_files_scanned = (int) get_option('wordfence_filesProcessed', 0);
                            }
                            if ($total_files_scanned == 0) {
                                $total_files_scanned = (int) get_option('wordfence_totalFiles', 0);
                            }
                            
                            // Tentar buscar da tabela do Wordfence diretamente
                            if ($total_files_scanned == 0) {
                                // Tentar várias tabelas do Wordfence
                                $wf_tables = array(
                                    $wpdb->prefix . 'wfScanners',
                                    $wpdb->prefix . 'wfFileMods',
                                    $wpdb->prefix . 'wfIssues'
                                );
                                
                                foreach ($wf_tables as $table_name) {
                                    if ($wpdb->get_var("SHOW TABLES LIKE '$table_name'") == $table_name) {
                                        // Tentar COUNT(*) primeiro
                                        $result = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");
                                        if ($result && $result > $total_files_scanned) {
                                            $total_files_scanned = (int) $result;
                                        }
                                        
                                        // Tentar buscar de uma coluna específica se existir
                                        $columns = $wpdb->get_col("SHOW COLUMNS FROM $table_name");
                                        if (in_array('file', $columns)) {
                                            $result = $wpdb->get_var("SELECT COUNT(DISTINCT file) FROM $table_name");
                                            if ($result && $result > $total_files_scanned) {
                                                $total_files_scanned = (int) $result;
                                            }
                                        }
                                    }
                                }
                            }
                            
                            // Tentar buscar de todas as opções do WordPress que começam com wordfence
                            if ($total_files_scanned == 0) {
                                try {
                                    $all_options = $wpdb->get_results(
                                        "SELECT option_name, option_value FROM {$wpdb->options} WHERE option_name LIKE 'wordfence%'",
                                        ARRAY_A
                                    );
                                    
                                    foreach ($all_options as $option) {
                                        $value = maybe_unserialize($option['option_value']);
                                        
                                        // Se for um array, procurar por chaves relacionadas a arquivos
                                        if (is_array($value)) {
                                            if (isset($value['filesProcessed'])) {
                                                $total_files_scanned = max($total_files_scanned, (int) $value['filesProcessed']);
                                            }
                                            if (isset($value['totalFiles'])) {
                                                $total_files_scanned = max($total_files_scanned, (int) $value['totalFiles']);
                                            }
                                            if (isset($value['files'])) {
                                                $total_files_scanned = max($total_files_scanned, (int) $value['files']);
                                            }
                                        }
                                        // Se for um número grande, pode ser o total de arquivos
                                        elseif (is_numeric($value) && $value > 1000 && $value < 1000000) {
                                            $total_files_scanned = max($total_files_scanned, (int) $value);
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                            
                            // Última tentativa: buscar da tabela wfScanners (pode ter contagem de arquivos)
                            if ($total_files_scanned == 0) {
                                try {
                                    $scanners_table = $wpdb->prefix . 'wfScanners';
                                    $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $scanners_table)) == $scanners_table;
                                    if ($table_exists) {
                                        // Contar registros na tabela wfScanners (cada registro pode representar um arquivo escaneado)
                                        $count = $wpdb->get_var("SELECT COUNT(*) FROM $scanners_table");
                                        if ($count && $count > 0) {
                                            $total_files_scanned = (int) $count;
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                            
                            // Tentar buscar da tabela wfFileMods também
                            if ($total_files_scanned == 0) {
                                try {
                                    $filemods_table = $wpdb->prefix . 'wfFileMods';
                                    $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $filemods_table)) == $filemods_table;
                                    if ($table_exists) {
                                        // Contar arquivos únicos na tabela wfFileMods
                                        $count = $wpdb->get_var("SELECT COUNT(DISTINCT filename) FROM $filemods_table");
                                        if ($count && $count > 0) {
                                            $total_files_scanned = (int) $count;
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                            
                            // Tentar buscar do resumo do scan via wfIssues
                            if ($total_files_scanned == 0 && class_exists('wfIssues')) {
                                try {
                                    if (method_exists('wfIssues', 'shared')) {
                                        $wf_issues = wfIssues::shared();
                                        if (is_object($wf_issues) && method_exists($wf_issues, 'getSummary')) {
                                            $summary = $wf_issues->getSummary();
                                            // O resumo pode ter informações sobre arquivos processados
                                            if (isset($summary['filesProcessed'])) {
                                                $total_files_scanned = (int) $summary['filesProcessed'];
                                            }
                                            // Tentar outras chaves no resumo
                                            if ($total_files_scanned == 0 && isset($summary['totalFiles'])) {
                                                $total_files_scanned = (int) $summary['totalFiles'];
                                            }
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                        } catch (Exception $e) {
                            // Ignorar erro
                        }
                    }
                } catch (Exception $e) {
                    $total_files_scanned = 0;
                }
            } else {
                // Tentar acessar via constantes ou funções globais do Wordfence
                if (function_exists('wfConfig::get')) {
                    try {
                        $scan_completed = wfConfig::get('lastScanCompleted', 0);
                        $scan_running = wfConfig::get('scanRunning', false);
                        $total_files_scanned = (int) wfConfig::get('scanFilesProcessed', 0);
                    } catch (Exception $e) {
                        // Usar valores padrão
                    }
                }
            }
            
            // Obter issues e classificar por severidade
            $issues = array();
            $critical_issues = array();
            $medium_issues = array();
            $malware_detected = false;
            $infected_files = array();
            
            if (class_exists('wfIssues')) {
                if (method_exists('wfIssues', 'shared')) {
                    try {
                        $wf_issues = wfIssues::shared();
                        
                        if (is_object($wf_issues) && method_exists($wf_issues, 'getIssueCount')) {
                            // Tentar obter total de arquivos escaneados do resumo do scan
                            if ($total_files_scanned == 0 && method_exists($wf_issues, 'getScanSummary')) {
                                try {
                                    $scan_summary = $wf_issues->getScanSummary();
                                    if (is_array($scan_summary)) {
                                        if (isset($scan_summary['filesProcessed'])) {
                                            $total_files_scanned = (int) $scan_summary['filesProcessed'];
                                        }
                                        if ($total_files_scanned == 0 && isset($scan_summary['totalFiles'])) {
                                            $total_files_scanned = (int) $scan_summary['totalFiles'];
                                        }
                                        if ($total_files_scanned == 0 && isset($scan_summary['files'])) {
                                            $total_files_scanned = (int) $scan_summary['files'];
                                        }
                                        // Tentar outras chaves comuns
                                        if ($total_files_scanned == 0) {
                                            foreach ($scan_summary as $key => $value) {
                                                if (stripos($key, 'file') !== false && is_numeric($value) && $value > 1000) {
                                                    $total_files_scanned = (int) $value;
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                            
                            // Tentar obter via getSummary() também
                            if ($total_files_scanned == 0 && method_exists($wf_issues, 'getSummary')) {
                                try {
                                    $summary = $wf_issues->getSummary();
                                    if (is_array($summary)) {
                                        if (isset($summary['filesProcessed'])) {
                                            $total_files_scanned = (int) $summary['filesProcessed'];
                                        }
                                        if ($total_files_scanned == 0 && isset($summary['totalFiles'])) {
                                            $total_files_scanned = (int) $summary['totalFiles'];
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                            
                            // Tentar obter via getSummary() do wfConfig também
                            if ($total_files_scanned == 0 && is_object($wf_config) && method_exists($wf_config, 'get')) {
                                try {
                                    // Tentar várias chaves do wfConfig
                                    $config_keys = array('scanFilesProcessed', 'totalFilesScanned', 'scanFiles', 'filesScanned', 'totalFiles', 'lastScanFilesProcessed');
                                    foreach ($config_keys as $key) {
                                        $value = $wf_config->get($key, 0);
                                        if ($value && is_numeric($value) && $value > 1000) {
                                            $total_files_scanned = (int) $value;
                                            break;
                                        }
                                    }
                                } catch (Exception $e) {
                                    // Ignorar erro
                                }
                            }
                            
                            $issue_count = $wf_issues->getIssueCount();
                            
                            // Buscar todos os issues, não apenas os primeiros 100
                            if ($issue_count > 0 && method_exists($wf_issues, 'getIssues')) {
                                // Tentar diferentes formas de obter os issues
                                $all_issues = null;
                                
                                // Método 1: getIssues(offset, limit)
                                try {
                                    $all_issues = $wf_issues->getIssues(0, 1000);
                                } catch (Exception $e) {
                                    // Tentar método alternativo
                                }
                                
                                // Método 2: getIssues() sem parâmetros
                                if (empty($all_issues) || !is_array($all_issues)) {
                                    try {
                                        $all_issues = $wf_issues->getIssues();
                                    } catch (Exception $e) {
                                        // Continuar
                                    }
                                }
                                
                                // Método 3: getAllIssues() se disponível
                                if ((empty($all_issues) || !is_array($all_issues)) && method_exists($wf_issues, 'getAllIssues')) {
                                    try {
                                        $all_issues = $wf_issues->getAllIssues();
                                    } catch (Exception $e) {
                                        // Continuar
                                    }
                                }
                                
                                if (is_array($all_issues) && count($all_issues) > 0) {
                                    foreach ($all_issues as $issue) {
                                        if (!is_object($issue)) {
                                            continue;
                                        }
                                        
                                        $type = 'unknown';
                                        if (isset($issue->type)) {
                                            $type = $issue->type;
                                        }
                                        
                                        $severity = isset($issue->severity) ? (int) $issue->severity : 0;
                                        
                                        // Verificar severityLabel se disponível (pode ser "Crítico", "Médio", etc)
                                        $severity_label = '';
                                        if (isset($issue->severityLabel)) {
                                            $severity_label = strtolower($issue->severityLabel);
                                        }
                                        
                                        $file = null;
                                        if (isset($issue->data) && is_array($issue->data) && isset($issue->data['file'])) {
                                            $file = $issue->data['file'];
                                        }
                                        
                                        $issue_data = array(
                                            'type' => $type,
                                            'severity' => $severity,
                                            'severity_label' => $severity_label,
                                            'message' => isset($issue->shortMsg) ? $issue->shortMsg : '',
                                            'file' => $file
                                        );
                                        
                                        $issues[] = $issue_data;
                                        
                                        // Classificar por severidade: 
                                        // Crítico: severity >= 100 OU type = 'file' (malware)
                                        // Médio: severity < 100 mas > 0
                                        $is_critical = false;
                                        $is_medium = false;
                                        
                                        // Verificar por severity numérico (crítico >= 100, pois severity é tinyint max 255)
                                        if ($severity >= 100) {
                                            $is_critical = true;
                                        } else if ($severity > 0 && $severity < 100) {
                                            $is_medium = true;
                                        }
                                        
                                        // Verificar por severityLabel (texto)
                                        if ($severity_label === 'crítico' || $severity_label === 'critical' || $severity_label === 'critico') {
                                            $is_critical = true;
                                            $is_medium = false;
                                        } else if ($severity_label === 'médio' || $severity_label === 'medium' || $severity_label === 'medio') {
                                            $is_medium = true;
                                            $is_critical = false;
                                        }
                                        
                                        // Verificar tipos críticos: 'file' = malware = sempre crítico
                                        if ($type === 'file') {
                                            $is_critical = true;
                                            $is_medium = false;
                                        }
                                        
                                        // Verificar se a mensagem contém palavras-chave de severidade
                                        $message_lower = strtolower(isset($issue->shortMsg) ? $issue->shortMsg : '');
                                        if (stripos($message_lower, 'crítico') !== false || stripos($message_lower, 'critical') !== false || 
                                            stripos($message_lower, 'malicioso') !== false || stripos($message_lower, 'malware') !== false ||
                                            stripos($message_lower, 'backdoor') !== false) {
                                            $is_critical = true;
                                            $is_medium = false;
                                        } else if (stripos($message_lower, 'médio') !== false || stripos($message_lower, 'medium') !== false) {
                                            $is_medium = true;
                                            $is_critical = false;
                                        }
                                        
                                        // Classificar o issue
                                        if ($is_critical) {
                                            $critical_issues[] = $issue_data;
                                            $malware_detected = true;
                                            if ($file) {
                                                $infected_files[] = $file;
                                            }
                                        } else if ($is_medium) {
                                            $medium_issues[] = $issue_data;
                                        }
                                    }
                                }
                            }
                            
                            // SEMPRE tentar buscar do banco de dados (independente de getIssues() ou issue_count)
                            // Isso garante que pegamos todos os issues diretamente do banco
                            global $wpdb;
                            try {
                                // Tentar com diferentes variações do nome da tabela (case-sensitive)
                                // A tabela pode ser wfIssues, wfissues, ou wf_issues dependendo da versão do Wordfence
                                $possible_tables = array(
                                    $wpdb->prefix . 'wfIssues',
                                    $wpdb->prefix . 'wfissues',
                                    $wpdb->prefix . 'wf_issues'
                                );
                                
                                $issues_table = null;
                                foreach ($possible_tables as $table_name) {
                                    $table_exists = $wpdb->get_var($wpdb->prepare("SHOW TABLES LIKE %s", $table_name)) == $table_name;
                                    if ($table_exists) {
                                        $issues_table = $table_name;
                                        break;
                                    }
                                }
                                
                                // Se não encontrou, tentar buscar todas as tabelas que começam com wf
                                if (!$issues_table) {
                                    $all_tables = $wpdb->get_col("SHOW TABLES LIKE '" . $wpdb->prefix . "wf%'");
                                    foreach ($all_tables as $table) {
                                        if (stripos($table, 'issue') !== false) {
                                            $issues_table = $table;
                                            break;
                                        }
                                    }
                                }
                                
                                if ($issues_table) {
                                    // Primeiro, verificar quais colunas existem na tabela
                                    $columns = $wpdb->get_col("SHOW COLUMNS FROM $issues_table");
                                    
                                    // Construir query dinâmica baseada nas colunas disponíveis
                                    $select_fields = array();
                                    if (in_array('id', $columns)) $select_fields[] = 'id';
                                    if (in_array('time', $columns)) $select_fields[] = 'time';
                                    if (in_array('lastUpdated', $columns)) $select_fields[] = 'lastUpdated';
                                    if (in_array('status', $columns)) $select_fields[] = 'status';
                                    if (in_array('type', $columns)) $select_fields[] = 'type';
                                    if (in_array('severity', $columns)) $select_fields[] = 'severity';
                                    if (in_array('ignoreP', $columns)) $select_fields[] = 'ignoreP';
                                    if (in_array('ignoreC', $columns)) $select_fields[] = 'ignoreC';
                                    if (in_array('shortMsg', $columns)) $select_fields[] = 'shortMsg';
                                    if (in_array('longMsg', $columns)) $select_fields[] = 'longMsg';
                                    if (in_array('data', $columns)) $select_fields[] = 'data';
                                    
                                    if (count($select_fields) > 0) {
                                        $select_sql = implode(', ', $select_fields);
                                        
                                        // Primeiro, tentar buscar com status = 'new'
                                        $db_issues = $wpdb->get_results(
                                            $wpdb->prepare(
                                                "SELECT $select_sql 
                                                 FROM $issues_table 
                                                 WHERE status = %s 
                                                 ORDER BY severity DESC 
                                                 LIMIT 1000",
                                                'new'
                                            ),
                                            OBJECT
                                        );
                                        
                                        // Se não encontrou issues com status 'new', tentar sem filtro de status
                                        // IMPORTANTE: ignoreP e ignoreC são char(32), não números! Verificar se são strings vazias
                                        if (empty($db_issues) || !is_array($db_issues) || count($db_issues) == 0) {
                                            $where_clause = '';
                                            if (in_array('ignoreP', $columns) && in_array('ignoreC', $columns)) {
                                                // ignoreP e ignoreC são char(32), então verificar se são strings vazias ou NULL
                                                $where_clause = "WHERE (ignoreP = '' OR ignoreP IS NULL) AND (ignoreC = '' OR ignoreC IS NULL)";
                                            } elseif (in_array('ignoreP', $columns)) {
                                                $where_clause = "WHERE (ignoreP = '' OR ignoreP IS NULL)";
                                            } elseif (in_array('ignoreC', $columns)) {
                                                $where_clause = "WHERE (ignoreC = '' OR ignoreC IS NULL)";
                                            }
                                            
                                            if ($where_clause) {
                                                $db_issues = $wpdb->get_results(
                                                    "SELECT $select_sql 
                                                     FROM $issues_table 
                                                     $where_clause
                                                     ORDER BY severity DESC 
                                                     LIMIT 1000",
                                                    OBJECT
                                                );
                                            }
                                        }
                                        
                                        // Se ainda não encontrou, buscar TODOS os issues sem filtro
                                        if (empty($db_issues) || !is_array($db_issues) || count($db_issues) == 0) {
                                            $db_issues = $wpdb->get_results(
                                                "SELECT $select_sql 
                                                 FROM $issues_table 
                                                 ORDER BY severity DESC 
                                                 LIMIT 1000",
                                                OBJECT
                                            );
                                        }
                                        
                                        if (is_array($db_issues) && count($db_issues) > 0) {
                                            foreach ($db_issues as $db_issue) {
                                                $severity = isset($db_issue->severity) ? (int) $db_issue->severity : 0;
                                                $type = isset($db_issue->type) ? $db_issue->type : 'unknown';
                                                
                                                // Parse do campo data (pode ser JSON ou serializado)
                                                $file = null;
                                                if (isset($db_issue->data) && !empty($db_issue->data)) {
                                                    $data = maybe_unserialize($db_issue->data);
                                                    if (is_array($data)) {
                                                        if (isset($data['file'])) {
                                                            $file = $data['file'];
                                                        } elseif (isset($data['realFile'])) {
                                                            $file = $data['realFile'];
                                                        }
                                                    } elseif (is_string($data)) {
                                                        $file = $data;
                                                    }
                                                }
                                                
                                                $short_msg = isset($db_issue->shortMsg) ? $db_issue->shortMsg : '';
                                                
                                                // Verificar se já existe este issue no array (evitar duplicatas)
                                                $issue_exists = false;
                                                foreach ($issues as $existing_issue) {
                                                    if ($existing_issue['type'] === $type && 
                                                        $existing_issue['severity'] === $severity &&
                                                        $existing_issue['message'] === $short_msg) {
                                                        $issue_exists = true;
                                                        break;
                                                    }
                                                }
                                                
                                                if (!$issue_exists) {
                                                    $issue_data = array(
                                                        'type' => $type,
                                                        'severity' => $severity,
                                                        'severity_label' => '',
                                                        'message' => $short_msg,
                                                        'file' => $file
                                                    );
                                                    
                                                    $issues[] = $issue_data;
                                                    
                                                    // Classificar por severidade: 
                                                    // Crítico: severity >= 100 OU type = 'file' (malware)
                                                    // Médio: severity < 100 mas > 0
                                                    $is_critical_issue = false;
                                                    
                                                    // Verificar por severity (crítico >= 100)
                                                    if ($severity >= 100) {
                                                        $is_critical_issue = true;
                                                    }
                                                    
                                                    // Verificar por type (file = malware = crítico)
                                                    if ($type === 'file') {
                                                        $is_critical_issue = true;
                                                    }
                                                    
                                                    if ($is_critical_issue) {
                                                        $critical_issues[] = $issue_data;
                                                        $malware_detected = true;
                                                        if ($file) {
                                                            $infected_files[] = $file;
                                                        }
                                                    } else if ($severity > 0 && $severity < 100) {
                                                        $medium_issues[] = $issue_data;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (Exception $e) {
                                // Log do erro para debug
                                error_log('Artna Monitor - Erro ao buscar issues do banco: ' . $e->getMessage());
                                error_log('Artna Monitor - Stack trace: ' . $e->getTraceAsString());
                            }
                        }
                    } catch (Exception $e) {
                        // Ignorar erro
                    }
                }
            }
            
            // Determinar status baseado na severidade dos problemas encontrados
            $status = 'clean';
            $critical_count = count($critical_issues);
            $medium_count = count($medium_issues);
            
            // Se há problemas CRÍTICOS (severity >= 100 OU type = 'file'), status é infected (vermelho)
            // Nota: severity é tinyint(3) UNSIGNED, então máximo é 255, não 1000
            if ($critical_count > 0 || $malware_detected || count($infected_files) > 0) {
                $status = 'infected';
            } 
            // Se há problemas MÉDIOS (severity < 100 mas > 0), status é warning (amarelo)
            else if ($medium_count > 0) {
                $status = 'warning';
            }
            // Se há issues encontrados mas não classificados, verificar pelo count total
            else if (isset($issue_count) && $issue_count > 0) {
                $status = 'warning';
            }
            else if (count($issues) > 0) {
                $status = 'warning';
            }
            
            // Formatar última varredura
            $last_scan = null;
            if ($scan_completed && is_numeric($scan_completed) && $scan_completed > 0) {
                $last_scan = date('c', $scan_completed);
            }
            
            // Usar issue_count se disponível, senão usar count($issues)
            $warnings_count = isset($issue_count) ? $issue_count : count($issues);
            
            return array(
                'success' => true,
                'scan_status' => $status,
                'malware_detected' => $malware_detected,
                'infected_files' => array_unique($infected_files),
                'last_scan' => $last_scan,
                'scan_running' => $scan_running ? true : false,
                'total_files_scanned' => $total_files_scanned,
                'infected_files_count' => count(array_unique($infected_files)),
                'warnings_count' => $warnings_count,
                'critical_count' => $critical_count,
                'medium_count' => $medium_count,
                'issues' => $issues
            );
            
        } catch (Exception $e) {
            return new WP_Error(
                'wordfence_error',
                'Erro ao obter status do Wordfence: ' . $e->getMessage(),
                array('status' => 500)
            );
        }
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Artna Monitor',
            'Artna Monitor',
            'manage_options',
            'artna-monitor',
            array($this, 'render_settings_page')
        );
    }
    
    public function register_settings() {
        register_setting('artna_monitor_settings', 'artna_monitor_api_key', array(
            'type' => 'string',
            'sanitize_callback' => 'sanitize_text_field',
            'default' => ''
        ));
    }
    
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        if (isset($_POST['artna_monitor_save']) && check_admin_referer('artna_monitor_settings')) {
            $api_key = isset($_POST['artna_monitor_api_key']) ? trim(sanitize_text_field($_POST['artna_monitor_api_key'])) : '';
            
            if (empty($api_key)) {
                $api_key = $this->generate_api_key();
            }
            
            update_option('artna_monitor_api_key', $api_key);
            echo '<div class="notice notice-success"><p>Configurações salvas com sucesso!</p></div>';
        }
        
        $api_key = get_option('artna_monitor_api_key', '');
        $wordfence_installed = class_exists('wfConfig');
        $endpoint_url = rest_url('artna-monitor/v1/wordfence-status');
        
        ?>
        <div class="wrap">
            <h1>Artna Monitor - Configurações</h1>
            
            <div class="card" style="max-width: 800px;">
                <h2>Configuração da Integração</h2>
                
                <?php if (!$wordfence_installed): ?>
                    <div class="notice notice-warning">
                        <p><strong>Atenção:</strong> O plugin Wordfence não está instalado ou não está ativo. Este plugin requer o Wordfence para funcionar.</p>
                    </div>
                <?php endif; ?>
                
                <form method="post" action="">
                    <?php wp_nonce_field('artna_monitor_settings'); ?>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row">
                                <label for="artna_monitor_api_key">API Key</label>
                            </th>
                            <td>
                                <input 
                                    type="text" 
                                    id="artna_monitor_api_key" 
                                    name="artna_monitor_api_key" 
                                    value="<?php echo esc_attr($api_key); ?>"
                                    class="regular-text"
                                    placeholder="Deixe em branco para gerar automaticamente"
                                />
                                <p class="description">
                                    Esta é a chave de API que será usada pelo sistema Artna Monitor para acessar os dados do Wordfence.
                                    <br>
                                    <strong>A API key é gerada automaticamente quando você salva pela primeira vez.</strong>
                                </p>
                                <?php if (empty($api_key)): ?>
                                    <p style="color: #d97706; margin-top: 10px;">
                                        <strong>⚠️ Atenção:</strong> Nenhuma API key configurada. Clique em "Salvar Configurações" para gerar uma automaticamente.
                                    </p>
                                <?php endif; ?>
                            </td>
                        </tr>
                    </table>
                    
                    <p class="submit">
                        <input type="submit" name="artna_monitor_save" class="button button-primary" value="Salvar Configurações" />
                    </p>
                </form>
            </div>
            
            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2>Informações da Integração</h2>
                
                <table class="form-table">
                    <tr>
                        <th scope="row">Status do Wordfence</th>
                        <td>
                            <?php if ($wordfence_installed): ?>
                                <span style="color: green;">✓ Instalado e Ativo</span>
                            <?php else: ?>
                                <span style="color: red;">✗ Não Instalado</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">Endpoint URL</th>
                        <td>
                            <code><?php echo esc_html($endpoint_url); ?></code>
                            <button type="button" class="button button-small" onclick="copyToClipboard('<?php echo esc_js($endpoint_url); ?>')" style="margin-left: 10px;">
                                Copiar URL
                            </button>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">API Key (Use Esta)</th>
                        <td>
                            <?php if ($api_key): ?>
                                <div style="margin-bottom: 10px;">
                                    <code style="font-size: 12px; background: #f5f5f5; padding: 8px 12px; border-radius: 3px; display: inline-block; word-break: break-all; max-width: 100%;"><?php echo esc_html($api_key); ?></code>
                                </div>
                                <button type="button" class="button button-primary" onclick="copyToClipboard('<?php echo esc_js($api_key); ?>')">
                                    📋 Copiar API Key
                                </button>
                                <p class="description" style="margin-top: 10px;">
                                    <strong>⚠️ IMPORTANTE:</strong> Use esta API key no sistema Artna Monitor. Copie exatamente como está acima.
                                </p>
                            <?php else: ?>
                                <span style="color: #999;">Nenhuma API key configurada. Configure acima e salve para gerar uma automaticamente.</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row">URL Completa de Teste</th>
                        <td>
                            <?php if ($api_key): ?>
                                <div style="margin-bottom: 10px;">
                                    <code style="font-size: 11px; word-break: break-all; background: #f5f5f5; padding: 8px 12px; border-radius: 3px; display: inline-block; max-width: 100%;"><?php echo esc_html($endpoint_url . '?api_key=' . $api_key); ?></code>
                                </div>
                                <button type="button" class="button button-primary" onclick="copyToClipboard('<?php echo esc_js($endpoint_url . '?api_key=' . $api_key); ?>')">
                                    📋 Copiar URL Completa
                                </button>
                                <p class="description" style="margin-top: 10px;">
                                    Cole esta URL no navegador para testar se o endpoint está funcionando. Deve retornar JSON com dados do Wordfence.
                                </p>
                            <?php else: ?>
                                <span style="color: #999;">Configure a API key primeiro</span>
                            <?php endif; ?>
                        </td>
                    </tr>
                </table>
            </div>
            
            <div class="card" style="max-width: 800px; margin-top: 20px;">
                <h2>Instruções</h2>
                <ol>
                    <li>Certifique-se de que o <strong>Wordfence</strong> está instalado e ativo</li>
                    <li>Configure uma <strong>API Key</strong> acima (ou deixe em branco para gerar automaticamente)</li>
                    <li>Salve as configurações</li>
                    <li>Copie a <strong>API Key</strong> e a <strong>Endpoint URL</strong></li>
                    <li>No sistema Artna Monitor, vá em <strong>Configurações → Sites Monitorados</strong></li>
                    <li>Selecione o site e configure a API Key do Wordfence</li>
                </ol>
            </div>
        </div>
        
        <script>
        function copyToClipboard(text) {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(function() {
                    alert('Copiado para a área de transferência!');
                }).catch(function() {
                    fallbackCopy(text);
                });
            } else {
                fallbackCopy(text);
            }
        }
        
        function fallbackCopy(text) {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                alert('Copiado para a área de transferência!');
            } catch (err) {
                alert('Erro ao copiar. Selecione e copie manualmente.');
            }
            document.body.removeChild(textarea);
        }
        </script>
        <?php
    }
    
    private function generate_api_key() {
        if (function_exists('random_bytes')) {
            return bin2hex(random_bytes(32));
        } else {
            // Fallback para versões antigas do PHP
            return bin2hex(openssl_random_pseudo_bytes(32));
        }
    }
    
    public function add_plugin_action_links($links) {
        $settings_link = '<a href="' . admin_url('options-general.php?page=artna-monitor') . '">Configurações</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
}

function artna_monitor_init() {
    return Artna_Monitor::get_instance();
}

add_action('plugins_loaded', 'artna_monitor_init');
