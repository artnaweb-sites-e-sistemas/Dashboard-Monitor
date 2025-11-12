# Configuração do Serviço Systemd - Backend

Este guia mostra como configurar o backend para iniciar automaticamente no servidor.

## ✅ Vantagens do Systemd Service

- ✅ **Inicia automaticamente** quando o servidor reiniciar
- ✅ **Reinicia automaticamente** se o processo parar/crashar
- ✅ **Gerenciamento fácil** com comandos simples
- ✅ **Logs centralizados** no systemd
- ✅ **Mais confiável** que nohup ou scripts manuais

## 📋 Pré-requisitos

- Acesso root (sudo) no servidor
- Backend já configurado e funcionando
- Node.js v16.20.2 instalado em `/root/.nvm/versions/node/v16.20.2/`

## 🚀 Instalação Rápida

### 1. Fazer upload dos arquivos

Certifique-se de que os arquivos estão no servidor:
- `backend/artnaweb-monitor.service`
- `backend/setup-service.sh`

### 2. Executar o script de configuração

```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
chmod +x setup-service.sh
sudo bash setup-service.sh
```

O script irá:
1. Parar processos antigos do backend
2. Copiar o arquivo de serviço para `/etc/systemd/system/`
3. Recarregar o systemd
4. Habilitar o serviço para iniciar no boot
5. Iniciar o serviço

## 🎮 Comandos Úteis

### Ver status do serviço
```bash
sudo systemctl status artnaweb-monitor.service
```

### Ver logs em tempo real
```bash
sudo journalctl -u artnaweb-monitor.service -f
```

### Ver últimas 50 linhas dos logs
```bash
sudo journalctl -u artnaweb-monitor.service -n 50
```

### Reiniciar o serviço
```bash
sudo systemctl restart artnaweb-monitor.service
```

### Parar o serviço
```bash
sudo systemctl stop artnaweb-monitor.service
```

### Iniciar o serviço
```bash
sudo systemctl start artnaweb-monitor.service
```

### Desabilitar início automático (se necessário)
```bash
sudo systemctl disable artnaweb-monitor.service
```

## 🔍 Verificação

Após a instalação, verifique:

1. **Serviço está rodando:**
   ```bash
   sudo systemctl status artnaweb-monitor.service
   ```
   Deve mostrar `Active: active (running)`

2. **Backend responde:**
   ```bash
   curl http://127.0.0.1:3001/api/health
   ```

3. **API funciona via Apache:**
   ```bash
   curl https://api.gestao.artnaweb.com.br/api/health
   ```

## 🐛 Troubleshooting

### Serviço não inicia

Verifique os logs:
```bash
sudo journalctl -u artnaweb-monitor.service -n 100
```

### Serviço para de funcionar

O systemd reinicia automaticamente após 10 segundos. Verifique os logs para identificar o problema:
```bash
sudo journalctl -u artnaweb-monitor.service -f
```

### Verificar se o processo está rodando
```bash
ps aux | grep "node server.js" | grep -v grep
```

### Testar manualmente (para debug)
```bash
cd /home/artnaw49/gestao.artnaweb.com.br/backend
/root/.nvm/versions/node/v16.20.2/bin/node server.js
```

## 📝 Notas

- O serviço reinicia automaticamente se o processo morrer
- Os logs são salvos em `/home/artnaw49/gestao.artnaweb.com.br/backend/server.log`
- O serviço inicia automaticamente quando o servidor reinicia
- O serviço aguarda a rede e MySQL estarem prontos antes de iniciar

