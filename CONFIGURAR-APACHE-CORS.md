# Configurar Apache para CORS

O problema é que o proxy reverso do Apache pode estar removendo os headers CORS. Siga estes passos:

## Opção 1: Configurar via cPanel (Recomendado)

1. Acesse o cPanel
2. Vá em **Subdomains** ou **Apache Configuration**
3. Encontre o subdomínio `api.gestao.artnaweb.com.br`
4. Adicione esta configuração no **Apache Include Editor** ou **.htaccess**:

```apache
<IfModule mod_headers.c>
    # Permitir CORS
    Header always set Access-Control-Allow-Origin "https://gestao.artnaweb.com.br"
    Header always set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header always set Access-Control-Allow-Headers "Content-Type, Authorization"
    Header always set Access-Control-Allow-Credentials "true"
    
    # Responder a requisições OPTIONS (preflight)
    RewriteEngine On
    RewriteCond %{REQUEST_METHOD} OPTIONS
    RewriteRule ^(.*)$ $1 [R=200,L]
</IfModule>

# Proxy reverso para Node.js
ProxyPreserveHost On
ProxyPass /api http://localhost:3001/api
ProxyPassReverse /api http://localhost:3001/api
```

## Opção 2: Criar arquivo .htaccess no diretório do subdomínio

Se você tem acesso ao diretório do subdomínio `api.gestao.artnaweb.com.br`, crie um arquivo `.htaccess`:

```bash
# No SSH, navegue até o diretório do subdomínio (geralmente em public_html ou similar)
# Crie o arquivo .htaccess com o conteúdo acima
```

## Opção 3: Configurar no backend para lidar com preflight

O backend já deve estar configurado, mas vamos garantir que está respondendo corretamente às requisições OPTIONS.

## Teste

Após configurar, teste:

```bash
curl -X OPTIONS https://api.gestao.artnaweb.com.br/api/auth/login \
  -H "Origin: https://gestao.artnaweb.com.br" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Deve retornar headers `Access-Control-Allow-Origin: https://gestao.artnaweb.com.br`

