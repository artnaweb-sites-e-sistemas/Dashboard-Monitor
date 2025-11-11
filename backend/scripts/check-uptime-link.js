/**
 * Script para verificar e vincular monitores do UptimeRobot aos sites
 */

require('dotenv').config();
const db = require('../config/database');
const uptimerobotService = require('../services/uptimerobotService');

async function checkAndLinkMonitors() {
  console.log('=== Verificação de Vínculo UptimeRobot ===\n');
  
  try {
    // 1. Buscar todos os sites
    const [sites] = await db.execute('SELECT id, domain, uptimerobot_monitor_id FROM sites');
    console.log(`Total de sites no banco: ${sites.length}\n`);
    
    // 2. Buscar todos os monitores do UptimeRobot
    console.log('Buscando monitores do UptimeRobot...');
    const monitorsResult = await uptimerobotService.getMonitors();
    
    if (!monitorsResult.success) {
      console.error('❌ Erro ao buscar monitores:', monitorsResult.message);
      return;
    }
    
    const monitors = monitorsResult.data?.monitors || [];
    console.log(`✅ ${monitors.length} monitor(es) encontrado(s) no UptimeRobot\n`);
    
    if (monitors.length === 0) {
      console.log('⚠️ Nenhum monitor encontrado no UptimeRobot');
      console.log('Crie monitores no UptimeRobot primeiro ou use o botão "Criar Monitor" no dashboard\n');
      return;
    }
    
    // 3. Listar monitores
    console.log('Monitores no UptimeRobot:');
    monitors.forEach((m, i) => {
      console.log(`  ${i + 1}. ID: ${m.id}, URL: ${m.url}, Status: ${m.status}`);
    });
    console.log('');
    
    // 4. Verificar vínculos
    console.log('Verificando vínculos...\n');
    
    for (const site of sites) {
      console.log(`Site: ${site.domain} (ID: ${site.id})`);
      
      if (site.uptimerobot_monitor_id) {
        // Verificar se o monitor ainda existe
        const monitor = monitors.find(m => m.id.toString() === site.uptimerobot_monitor_id.toString());
        if (monitor) {
          console.log(`  ✅ Vinculado ao monitor ID: ${site.uptimerobot_monitor_id}`);
          console.log(`     Status no UptimeRobot: ${monitor.status}`);
        } else {
          console.log(`  ⚠️ Monitor ID ${site.uptimerobot_monitor_id} não encontrado no UptimeRobot`);
          console.log(`     O monitor pode ter sido deletado.`);
        }
      } else {
        console.log(`  ❌ NÃO VINCULADO a nenhum monitor`);
        
        // Tentar encontrar monitor por domínio
        const domain = site.domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        const matchingMonitor = monitors.find(m => {
          const monitorUrl = m.url?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
          return monitorUrl === domain || monitorUrl?.includes(domain) || domain.includes(monitorUrl);
        });
        
        if (matchingMonitor) {
          console.log(`  💡 Monitor encontrado por domínio: ID ${matchingMonitor.id}`);
          console.log(`     Deseja vincular? Execute: node scripts/link-monitor.js ${site.id} ${matchingMonitor.id}`);
        } else {
          console.log(`  💡 Nenhum monitor encontrado para este domínio`);
          console.log(`     Crie um monitor no UptimeRobot ou use o botão "Criar Monitor" no dashboard`);
        }
      }
      console.log('');
    }
    
    // 5. Resumo
    const linkedSites = sites.filter(s => s.uptimerobot_monitor_id).length;
    const unlinkedSites = sites.length - linkedSites;
    
    console.log('=== RESUMO ===');
    console.log(`Total de sites: ${sites.length}`);
    console.log(`Sites vinculados: ${linkedSites}`);
    console.log(`Sites não vinculados: ${unlinkedSites}`);
    console.log(`Monitores no UptimeRobot: ${monitors.length}`);
    console.log('');
    
    if (unlinkedSites > 0) {
      console.log('⚠️ Para vincular sites aos monitores:');
      console.log('   1. Use o botão "Criar Monitor" no dashboard para cada site');
      console.log('   2. Ou execute: node scripts/link-monitor.js <site_id> <monitor_id>');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await db.end();
  }
}

checkAndLinkMonitors();

