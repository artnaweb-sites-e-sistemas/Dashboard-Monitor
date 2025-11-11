# ArtnaWEB Monitor - Node.js + React

Sistema de monitoramento de sites desenvolvido com **Node.js + Express** (backend) e **React** (frontend).

## Instalação Rápida

### 1. Instalar Dependências

Na raiz do projeto, execute:

```bash
npm run install:all
```

Isso instalará as dependências da raiz, backend e frontend automaticamente.

### 2. Configurar Backend

Copie o arquivo de exemplo para criar o `.env`:

```bash
# Windows PowerShell
Copy-Item backend\env.example.txt backend\.env

# Linux/Mac
cp backend/env.example.txt backend/.env
```

Edite o arquivo `backend/.env` com suas configurações de banco de dados.

### 3. Banco de Dados

Importe o arquivo `db.sql` no MySQL. Este arquivo contém todas as tabelas e configurações necessárias:
- Tabelas: users, sites, scan_history, clients, report_history, settings
- Configurações padrão do sistema
- Estrutura completa do banco de dados

### 4. Criar Usuário Admin

```bash
cd backend
node scripts/create-admin.js
```

### 5. Iniciar Servidores (RECOMENDADO)

**Na raiz do projeto**, execute um único comando para iniciar ambos os servidores:

```bash
npm run dev
```

Isso iniciará:
- ✅ Backend na porta 3001
- ✅ Frontend na porta 3000

Os logs aparecerão no mesmo terminal com cores diferentes para facilitar a identificação.

### 6. Acessar

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001/api
- **Login:** admin / admin123

## Estrutura do Projeto

```
Checar/
├── backend/          # API Node.js + Express
│   ├── config/       # Configurações (database.js)
│   ├── middleware/   # Middlewares (auth.js)
│   ├── routes/       # Rotas da API
│   ├── services/     # Serviços (scan, email, etc)
│   ├── scripts/      # Scripts úteis
│   └── server.js     # Servidor principal
├── frontend/         # React + Vite
│   └── src/          # Código fonte React
├── package.json      # Scripts para rodar tudo junto
└── db.sql            # Schema do banco de dados
```

## Comandos Disponíveis

### Na Raiz do Projeto (RECOMENDADO):

```bash
# Instalar todas as dependências
npm run install:all

# Iniciar backend e frontend juntos
npm run dev

# Iniciar apenas o backend
npm run dev:backend

# Iniciar apenas o frontend
npm run dev:frontend
```

### Comandos Individuais:

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

## Problemas de Login?

1. Execute `create-admin.bat` para criar/atualizar o usuário admin
2. Verifique se o backend está rodando na porta 3001
3. Verifique se o frontend está rodando na porta 3000
4. Abra o Console do navegador (F12) para ver erros
5. Verifique o console do backend para ver logs de login

## Configurações

Acesse a página de **Configurações** no menu do dashboard para configurar:

- **E-mail para Alertas**: E-mail que receberá notificações quando problemas forem detectados
- **Scan Automático**: Habilite/desabilite scans automáticos e configure o intervalo (minutos, horas ou dias)
- **Template de Email**: Personalize o template HTML dos emails de alerta
- **Template de Relatório**: Personalize o template HTML dos emails de relatório
- **Relatórios Automáticos**: Configure o envio automático de relatórios para clientes

As configurações são salvas no banco de dados e aplicadas imediatamente.

## Sistema de Clientes e Relatórios

### Funcionalidades

1. **Gerenciamento de Clientes**:
   - Cada site pode ser associado a um cliente
   - Um cliente pode ter múltiplos sites
   - Clientes possuem: nome, email e telefone

2. **Adicionar Site com Cliente**:
   - Ao adicionar um site, você pode selecionar um cliente existente
   - O cliente precisa ser criado via API (rotas `/api/clients`)

3. **Envio de Relatórios**:
   - Botão "Enviar Relatório" aparece nas ações do site (apenas se o site tiver um cliente associado)
   - O relatório é enviado por email para o cliente
   - O relatório inclui informações de todos os sites do cliente

4. **Configuração de Relatórios**:
   - Acesse a aba "Template de Relatório" nas Configurações
   - Personalize o template HTML do email de relatório
   - Configure o envio automático de relatórios (intervalo em minutos, horas ou dias)

### API de Clientes

O sistema possui rotas de API para gerenciar clientes:

- `GET /api/clients` - Listar todos os clientes
- `GET /api/clients/:id` - Obter um cliente específico
- `POST /api/clients` - Criar novo cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Deletar cliente
- `GET /api/clients/:id/sites` - Obter sites de um cliente

### API de Relatórios

- `POST /api/reports/site/:id` - Enviar relatório para um site específico
- `POST /api/reports/client/:id` - Enviar relatório para todos os sites de um cliente

## Scan Automático

O scan automático está **configurado para executar a cada 1 minuto** por padrão.

### Verificar Status do Scan Automático

Execute o script de teste:
```bash
cd backend
node scripts/test-auto-scan.js
```

Ou use o script completo:
```bash
verificar-scan-automatico.bat
```

### Como Funciona

1. **Inicialização**: Quando o servidor backend inicia, o serviço de scan automático é iniciado automaticamente
2. **Primeiro Scan**: O primeiro scan é executado imediatamente após iniciar o servidor
3. **Scans Subsequentes**: Os próximos scans são executados automaticamente conforme o intervalo configurado
4. **Logs**: Todos os scans são logados no console do servidor backend

### Troubleshooting

Se o scan automático não estiver funcionando:

1. **Verifique se o servidor backend está rodando**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Verifique os logs do servidor backend** para ver mensagens como:
   - `[Auto Scan] Serviço de scan automático iniciado com sucesso!`
   - `[Auto Scan] Iniciando scan automático...`

3. **Verifique as configurações no banco de dados**:
   ```bash
   cd backend
   node scripts/test-auto-scan.js
   ```

4. **Reinicie o servidor backend** para aplicar mudanças nas configurações

## Notas

- Backend: porta 3001
- Frontend: porta 3000
- Token JWT armazenado no localStorage
- Credenciais padrão: admin / admin123
- Scan automático: Configurável na página de Configurações
- E-mail de alerta: Configurável na página de Configurações
