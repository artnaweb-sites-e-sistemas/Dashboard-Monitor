#!/bin/bash

echo "=========================================="
echo "CONFIGURAÇÃO DO SERVIÇO SYSTEMD"
echo "ArtnaWEB Monitor Backend"
echo "=========================================="
echo ""

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Este script precisa ser executado como root"
    echo "   Execute: sudo bash setup-service.sh"
    exit 1
fi

SERVICE_FILE="/etc/systemd/system/artnaweb-monitor.service"
BACKEND_DIR="/home/artnaw49/gestao.artnaweb.com.br/backend"

echo "1️⃣ Parando processos antigos do backend..."
pkill -f "node server.js" 2>/dev/null
sleep 2
echo "   ✅ Processos antigos parados"
echo ""

echo "2️⃣ Copiando arquivo de serviço..."
cp "$BACKEND_DIR/artnaweb-monitor.service" "$SERVICE_FILE"
if [ $? -eq 0 ]; then
    echo "   ✅ Arquivo de serviço copiado para $SERVICE_FILE"
else
    echo "   ❌ Erro ao copiar arquivo de serviço"
    exit 1
fi
echo ""

echo "3️⃣ Recarregando systemd..."
systemctl daemon-reload
if [ $? -eq 0 ]; then
    echo "   ✅ Systemd recarregado"
else
    echo "   ❌ Erro ao recarregar systemd"
    exit 1
fi
echo ""

echo "4️⃣ Habilitando serviço para iniciar no boot..."
systemctl enable artnaweb-monitor.service
if [ $? -eq 0 ]; then
    echo "   ✅ Serviço habilitado para iniciar automaticamente"
else
    echo "   ❌ Erro ao habilitar serviço"
    exit 1
fi
echo ""

echo "5️⃣ Iniciando serviço..."
systemctl start artnaweb-monitor.service
if [ $? -eq 0 ]; then
    echo "   ✅ Serviço iniciado"
else
    echo "   ❌ Erro ao iniciar serviço"
    echo "   Verifique os logs: journalctl -u artnaweb-monitor.service -n 50"
    exit 1
fi
echo ""

echo "6️⃣ Verificando status do serviço..."
sleep 2
systemctl status artnaweb-monitor.service --no-pager -l
echo ""

echo "=========================================="
echo "✅ CONFIGURAÇÃO CONCLUÍDA!"
echo "=========================================="
echo ""
echo "Comandos úteis:"
echo "  • Ver status:     systemctl status artnaweb-monitor.service"
echo "  • Ver logs:       journalctl -u artnaweb-monitor.service -f"
echo "  • Reiniciar:      systemctl restart artnaweb-monitor.service"
echo "  • Parar:          systemctl stop artnaweb-monitor.service"
echo "  • Iniciar:        systemctl start artnaweb-monitor.service"
echo "  • Desabilitar:    systemctl disable artnaweb-monitor.service"
echo ""

