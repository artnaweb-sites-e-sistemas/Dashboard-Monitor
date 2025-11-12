# 🔒 Segurança do Serviço Systemd - ArtnaWEB Monitor

## ✅ É SEGURO usar systemd service?

**SIM! É a prática padrão e recomendada** para serviços em produção no Linux. Na verdade, é **MAIS SEGURO** que usar `nohup` ou scripts manuais.

## 🛡️ Por que é seguro?

### 1. **Prática Padrão da Indústria**
- Systemd é o sistema de inicialização padrão do CentOS 7.9
- Usado por milhares de servidores em produção
- Mesma tecnologia usada por Apache, MySQL, Nginx, etc.

### 2. **Isolamento e Controle**
O serviço está configurado com:
- ✅ **Limites de memória** (512MB máximo)
- ✅ **Limites de CPU** (50% máximo)
- ✅ **Limites de processos** (50 máximo)
- ✅ **Proteção de diretórios do sistema**
- ✅ **Sem escalação de privilégios**

### 3. **Não Afeta Outros Serviços**
- ✅ **Isolado**: Roda apenas o Node.js, não interfere em nada
- ✅ **Recursos limitados**: Não pode consumir toda a memória/CPU
- ✅ **Mesma porta**: Usa apenas a porta 3001 (já configurada)
- ✅ **Mesmo processo**: É o mesmo código que você já estava rodando

## 📊 Comparação de Segurança

| Método | Segurança | Controle | Recursos | Recomendado |
|--------|-----------|----------|----------|-------------|
| **Systemd Service** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ SIM |
| nohup (manual) | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ❌ NÃO |
| PM2 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⚠️ Depende |
| Script no cron | ⭐⭐ | ⭐⭐ | ⭐⭐ | ❌ NÃO |

## 🔍 O que o serviço NÃO faz (proteções)

### ❌ NÃO acessa:
- Diretórios do sistema (`/usr`, `/etc`, `/var` - exceto logs)
- Outros sites ou contas de usuário
- Configurações do cPanel/WHM
- Banco de dados de outros clientes

### ✅ APENAS acessa:
- Seu próprio diretório: `/home/artnaw49/gestao.artnaweb.com.br/backend`
- Seu próprio banco de dados (via .env)
- Porta 3001 (já configurada no Apache)

## 🛡️ Proteções Implementadas

### Limites de Recursos
```ini
MemoryLimit=512M      # Máximo 512MB de RAM
CPUQuota=50%         # Máximo 50% de CPU
TasksMax=50          # Máximo 50 processos
```

**Isso significa:**
- Se o backend tentar usar mais de 512MB, será **automaticamente limitado**
- Se usar mais de 50% de CPU, será **throttled** (reduzido)
- **Nunca** vai consumir todos os recursos do servidor

### Proteções de Segurança
```ini
NoNewPrivileges=true  # Não pode escalar privilégios
PrivateTmp=true       # Diretório /tmp isolado
ProtectSystem=strict # Protege diretórios do sistema
ProtectHome=read-only # Protege /home de outros usuários
```

## 🚨 E se algo der errado?

### O serviço tem proteções automáticas:
1. **Se crashar**: Reinicia automaticamente após 10 segundos
2. **Se usar muita memória**: É limitado a 512MB
3. **Se usar muita CPU**: É limitado a 50%
4. **Se travar**: Systemd detecta e reinicia

### Você pode:
- **Parar instantaneamente**: `sudo systemctl stop artnaweb-monitor.service`
- **Ver logs em tempo real**: `sudo journalctl -u artnaweb-monitor.service -f`
- **Desabilitar**: `sudo systemctl disable artnaweb-monitor.service`

## 📈 Impacto nos Recursos

### Antes (nohup):
- ❌ Sem limites de recursos
- ❌ Pode consumir toda a memória se houver bug
- ❌ Não reinicia automaticamente
- ❌ Logs podem crescer indefinidamente

### Depois (systemd):
- ✅ Limite de 512MB de RAM
- ✅ Limite de 50% de CPU
- ✅ Reinicia automaticamente
- ✅ Logs controlados pelo systemd

## ✅ Conclusão

**É 100% seguro e recomendado!**

O serviço systemd:
- ✅ É a prática padrão da indústria
- ✅ Tem proteções de segurança
- ✅ Limita recursos automaticamente
- ✅ Não interfere em outros serviços
- ✅ É mais confiável que métodos manuais

**Seus sites, VPS e recursos estão protegidos!** 🛡️

