#!/bin/bash

echo "=========================================="
echo "DIAGNÓSTICO DE CORS E BACKEND"
echo "=========================================="
echo ""

# 1. Verificar se o backend está rodando
echo "1️⃣ Verificando se o backend está rodando..."
if pgrep -f "node server.js" > /dev/null; then
    echo "   ✅ Backend está rodando"
    BACKEND_PID=$(pgrep -f "node server.js" | head -1)
    echo "   PID: $BACKEND_PID"
else
    echo "   ❌ Backend NÃO está rodando!"
    echo "   💡 Execute: cd /home/artnaw49/gestao.artnaweb.com.br/backend && nohup /root/.nvm/versions/node/v16.20.2/bin/node server.js > server.log 2>&1 &"
fi
echo ""

# 2. Verificar se a porta 3001 está escutando
echo "2️⃣ Verificando se a porta 3001 está escutando..."
if netstat -tlnp 2>/dev/null | grep :3001 > /dev/null || ss -tlnp 2>/dev/null | grep :3001 > /dev/null; then
    echo "   ✅ Porta 3001 está escutando"
    netstat -tlnp 2>/dev/null | grep :3001 || ss -tlnp 2>/dev/null | grep :3001
else
    echo "   ❌ Porta 3001 NÃO está escutando!"
fi
echo ""

# 3. Testar conexão local com o backend
echo "3️⃣ Testando conexão local com o backend..."
LOCAL_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/api/health 2>/dev/null)
if [ "$LOCAL_RESPONSE" = "200" ]; then
    echo "   ✅ Backend responde localmente (HTTP $LOCAL_RESPONSE)"
    curl -s http://127.0.0.1:3001/api/health | head -3
else
    echo "   ❌ Backend NÃO responde localmente (HTTP $LOCAL_RESPONSE)"
fi
echo ""

# 4. Testar requisição OPTIONS (preflight)
echo "4️⃣ Testando requisição OPTIONS (preflight)..."
OPTIONS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: https://gestao.artnaweb.com.br" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  http://127.0.0.1:3001/api/auth/login 2>/dev/null)
if [ "$OPTIONS_RESPONSE" = "200" ]; then
    echo "   ✅ Preflight OPTIONS funciona (HTTP $OPTIONS_RESPONSE)"
    echo "   Headers CORS:"
    curl -s -X OPTIONS \
      -H "Origin: https://gestao.artnaweb.com.br" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: Content-Type,Authorization" \
      -I http://127.0.0.1:3001/api/auth/login 2>/dev/null | grep -i "access-control" || echo "   ⚠️  Nenhum header CORS encontrado"
else
    echo "   ❌ Preflight OPTIONS NÃO funciona (HTTP $OPTIONS_RESPONSE)"
fi
echo ""

# 5. Testar através do Apache (subdomínio)
echo "5️⃣ Testando através do Apache (api.gestao.artnaweb.com.br)..."
APACHE_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://api.gestao.artnaweb.com.br/api/health 2>/dev/null)
if [ "$APACHE_RESPONSE" = "200" ]; then
    echo "   ✅ Apache está funcionando (HTTP $APACHE_RESPONSE)"
else
    echo "   ❌ Apache NÃO está funcionando (HTTP $APACHE_RESPONSE)"
    echo "   💡 Verifique a configuração do proxy no Apache"
fi
echo ""

# 6. Testar OPTIONS através do Apache
echo "6️⃣ Testando OPTIONS através do Apache..."
APACHE_OPTIONS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS \
  -H "Origin: https://gestao.artnaweb.com.br" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://api.gestao.artnaweb.com.br/api/auth/login 2>/dev/null)
if [ "$APACHE_OPTIONS" = "200" ]; then
    echo "   ✅ Preflight através do Apache funciona (HTTP $APACHE_OPTIONS)"
    echo "   Headers CORS:"
    curl -s -X OPTIONS \
      -H "Origin: https://gestao.artnaweb.com.br" \
      -H "Access-Control-Request-Method: POST" \
      -H "Access-Control-Request-Headers: Content-Type,Authorization" \
      -I https://api.gestao.artnaweb.com.br/api/auth/login 2>/dev/null | grep -i "access-control" || echo "   ⚠️  Nenhum header CORS encontrado"
else
    echo "   ❌ Preflight através do Apache NÃO funciona (HTTP $APACHE_OPTIONS)"
fi
echo ""

# 7. Verificar logs recentes do backend
echo "7️⃣ Últimas linhas do log do backend..."
if [ -f /home/artnaw49/gestao.artnaweb.com.br/backend/server.log ]; then
    echo "   Últimas 20 linhas:"
    tail -20 /home/artnaw49/gestao.artnaweb.com.br/backend/server.log | grep -E "(CORS|ERROR|Error|error|OPTIONS)" || tail -10 /home/artnaw49/gestao.artnaweb.com.br/backend/server.log
else
    echo "   ⚠️  Arquivo de log não encontrado"
fi
echo ""

# 8. Verificar configuração do Apache
echo "8️⃣ Verificando configuração do Apache..."
if [ -f /usr/local/apache/conf/userdata/std/2_4/artnaw49/api.gestao.artnaweb.com.br/proxy.conf ]; then
    echo "   ✅ Arquivo proxy.conf encontrado:"
    cat /usr/local/apache/conf/userdata/std/2_4/artnaw49/api.gestao.artnaweb.com.br/proxy.conf
else
    echo "   ❌ Arquivo proxy.conf NÃO encontrado!"
fi
echo ""

echo "=========================================="
echo "DIAGNÓSTICO CONCLUÍDO"
echo "=========================================="

