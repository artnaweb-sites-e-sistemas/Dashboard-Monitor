# 🤔 Preciso de Node.js no cPanel?

## Resposta Curta

**SIM e NÃO**, depende da parte do projeto:

- ✅ **Backend**: **SIM, precisa de Node.js** (é uma aplicação Node.js/Express)
- ✅ **Frontend**: **NÃO precisa de Node.js no servidor** (após build, vira HTML/JS estático)

## 📊 Como Funciona o Projeto

### Backend (Node.js/Express)
```
backend/
├── server.js          ← Precisa de Node.js para rodar
├── routes/            ← API REST
├── services/          ← Lógica de negócio
└── package.json       ← Dependências Node.js
```

**O que faz:**
- API REST (endpoints `/api/*`)
- Conecta com banco MySQL
- Integra com Sucuri, UptimeRobot, Wordfence
- Envia emails
- Processa scans

**Onde pode rodar:**
- ✅ Railway, Render, Heroku (serviços de hospedagem Node.js)
- ✅ VPS com Node.js instalado
- ✅ cPanel com Node.js habilitado
- ❌ cPanel sem Node.js (não funciona)

### Frontend (React)
```
frontend/
├── src/               ← Código React (desenvolvimento)
├── dist/              ← Build final (HTML/JS/CSS estático)
└── package.json       ← Dependências (só para build)
```

**O que faz:**
- Interface web (dashboard)
- Consome a API do backend
- HTML/JS/CSS estático após build

**Onde pode rodar:**
- ✅ **cPanel** (qualquer servidor web - Apache/Nginx)
- ✅ Qualquer hospedagem de arquivos estáticos
- ✅ GitHub Pages, Netlify, Vercel
- ❌ **NÃO precisa de Node.js no servidor** (só para fazer o build localmente)

## 🎯 Solução: Dividir em 2 Partes

### Parte 1: Backend (Precisa Node.js)
**Onde hospedar:**
- Railway (recomendado - grátis)
- Render (recomendado - grátis)
- Heroku (pago)
- VPS (você configura)
- Solicitar Node.js ao provedor cPanel

**O que você recebe:**
- Uma URL: `https://seu-backend.railway.app` ou similar
- Essa URL será a API do seu sistema

### Parte 2: Frontend (NÃO precisa Node.js)
**Onde hospedar:**
- ✅ **cPanel** (seu servidor atual)
- ✅ Qualquer hospedagem web

**O que você faz:**
1. Fazer build localmente: `npm run build` (gera pasta `dist/`)
2. Fazer upload da pasta `dist/` para `public_html/` no cPanel
3. Pronto! Frontend funcionando no cPanel

## 📝 Exemplo Prático

### Cenário: Backend no Railway + Frontend no cPanel

**Backend (Railway):**
```
URL: https://artnaweb-monitor.railway.app
- Roda Node.js
- API disponível em: https://artnaweb-monitor.railway.app/api
```

**Frontend (cPanel):**
```
URL: https://gestao.artnaweb.com.br
- Arquivos estáticos em: /home/artnaw49/gestao.artnaweb.com.br/public_html/
- Configuração: frontend/.env.production
  VITE_API_URL=https://artnaweb-monitor.railway.app/api
```

**Resultado:**
- ✅ Frontend no cPanel (sem Node.js)
- ✅ Backend no Railway (com Node.js)
- ✅ Tudo funcionando perfeitamente

## 🔄 Fluxo de Deploy

### 1. Backend (Railway/Render)
```bash
# Você faz push no GitHub
git push origin main

# Railway/Render detecta automaticamente
# Faz deploy automático
# Backend atualizado!
```

### 2. Frontend (cPanel)
```bash
# Você faz push no GitHub
git push origin main

# GitHub Actions faz build automaticamente
# Faz upload via FTP para cPanel
# Frontend atualizado!
```

## ❓ Perguntas Frequentes

**P: Posso colocar tudo no cPanel?**
R: Só se o cPanel tiver Node.js. Se não tiver, precisa separar: backend em outro lugar, frontend no cPanel.

**P: Preciso pagar por Railway/Render?**
R: Não! Ambos têm planos gratuitos suficientes para começar.

**P: É complicado ter backend e frontend separados?**
R: Não! É uma arquitetura comum e recomendada. O frontend apenas faz chamadas HTTP para a API do backend.

**P: O frontend precisa de Node.js para rodar?**
R: **NÃO!** Após o build (`npm run build`), o frontend vira apenas HTML/JS/CSS estático, que roda em qualquer servidor web.

**P: Posso fazer build do frontend no cPanel?**
R: Não é necessário. Você faz o build localmente ou o GitHub Actions faz automaticamente. O cPanel só precisa receber os arquivos já buildados.

## ✅ Resumo

| Componente | Precisa Node.js? | Onde Hospedar |
|------------|------------------|---------------|
| **Backend** | ✅ SIM | Railway, Render, VPS, ou cPanel com Node.js |
| **Frontend** | ❌ NÃO | cPanel (qualquer servidor web) |

## 🚀 Próximos Passos

1. **Escolha onde hospedar o backend:**
   - Railway (recomendado)
   - Render
   - Ou solicite Node.js ao provedor

2. **Frontend continua no cPanel:**
   - Já está configurado
   - Só precisa atualizar a URL da API

3. **Deploy automático:**
   - Backend: Automático via Railway/Render
   - Frontend: Automático via GitHub Actions → cPanel

## 💡 Conclusão

**Você NÃO precisa de Node.js no cPanel para o projeto funcionar!**

- ✅ Backend pode ir para Railway/Render (grátis)
- ✅ Frontend fica no cPanel (sem Node.js necessário)
- ✅ Tudo funciona perfeitamente separado

**É uma arquitetura moderna e recomendada!** 🎉

