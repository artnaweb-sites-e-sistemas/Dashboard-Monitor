#!/bin/bash

# Script de Deploy para cPanel
# Este script pode ser executado manualmente ou via webhook do GitHub

echo "🚀 Iniciando deploy do ArtnaWEB Monitor..."

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Diretório do projeto (ajuste conforme necessário)
PROJECT_DIR="/home/usuario/artnaweb-monitor"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"

# Ir para o diretório do projeto
cd $PROJECT_DIR || exit 1

echo -e "${YELLOW}📥 Atualizando código do GitHub...${NC}"
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer pull do GitHub${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Instalando dependências do backend...${NC}"
cd $BACKEND_DIR
npm install --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao instalar dependências do backend${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Instalando dependências do frontend...${NC}"
cd $FRONTEND_DIR
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao instalar dependências do frontend${NC}"
    exit 1
fi

echo -e "${YELLOW}🏗️  Fazendo build do frontend...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro ao fazer build do frontend${NC}"
    exit 1
fi

echo -e "${YELLOW}🔄 Reiniciando aplicação Node.js...${NC}"
# Reiniciar a aplicação Node.js no cPanel
# Isso pode variar dependendo da configuração do cPanel
# Você pode precisar usar: pm2 restart artnaweb-monitor
# Ou usar o comando do cPanel para reiniciar a aplicação

echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}📝 Verifique os logs da aplicação no cPanel${NC}"

