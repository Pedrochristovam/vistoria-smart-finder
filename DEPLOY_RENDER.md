# 🚀 Guia Completo: Deploy no Render

Este guia passo a passo te ajudará a fazer deploy do projeto **Vistoria Smart Finder** na plataforma Render.

## 📋 Pré-requisitos

1. **Conta no Render**
   - Acesse [https://render.com](https://render.com)
   - Crie uma conta gratuita (ou faça login)

2. **Repositório Git**
   - O código deve estar em um repositório Git (GitHub, GitLab ou Bitbucket)
   - Certifique-se de que todos os arquivos estão commitados e pushados

3. **Variáveis de Ambiente**
   - URL do Supabase
   - Chave pública (publishable key) do Supabase
   - Chave da API do Google Maps (opcional)

---

## 🎯 Opção 1: Deploy Manual via Dashboard do Render

### Passo 1: Acessar o Dashboard do Render

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Faça login na sua conta

### Passo 2: Criar Novo Static Site

1. Clique no botão **"New +"** no canto superior direito
2. Selecione **"Static Site"** (Site Estático)
3. Conecte seu repositório Git:
   - Se ainda não conectou, clique em **"Connect account"** e autorize o Render a acessar seu repositório
   - Selecione o repositório **vistoria-smart-finder**
   - Escolha a branch principal (geralmente `main` ou `master`)

### Passo 3: Configurar o Build

Preencha os campos da seguinte forma:

- **Name**: `vistoria-smart-finder` (ou qualquer nome de sua preferência)
- **Branch**: `main` (ou sua branch principal)
- **Root Directory**: Deixe vazio (ou `./` se necessário)
- **Build Command**: 
  ```bash
  npm install && npm run build
  ```
- **Publish Directory**: 
  ```
  dist
  ```

### Passo 4: Configurar Variáveis de Ambiente

Na seção **"Environment Variables"**, adicione as seguintes variáveis:

| Chave | Valor | Obrigatório |
|-------|-------|-------------|
| `VITE_SUPABASE_URL` | URL do seu projeto Supabase | ✅ Sim |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave pública do Supabase | ✅ Sim |
| `VITE_GOOGLE_MAPS_API_KEY` | Chave da API do Google Maps | ❌ Não (opcional) |
| `NODE_VERSION` | `18.20.4` | ✅ Sim |

**Como obter as credenciais do Supabase:**

1. Acesse [https://supabase.com](https://supabase.com)
2. Entre no seu projeto
3. Vá em **Settings** → **API**
4. Copie:
   - **Project URL** → use como `VITE_SUPABASE_URL`
   - **anon public** key → use como `VITE_SUPABASE_PUBLISHABLE_KEY`

**Como obter a chave do Google Maps (opcional):**

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie ou selecione um projeto
3. Ative as APIs:
   - Geocoding API
   - Places API
4. Vá em **Credenciais** → **Criar credencial** → **Chave de API**
5. Copie a chave e use como `VITE_GOOGLE_MAPS_API_KEY`

### Passo 5: Configurar Rotas (Importante para React Router)

Como o projeto usa React Router, precisamos garantir que todas as rotas sejam redirecionadas para `index.html`. 

No campo **"Headers"** ou nas configurações avançadas, adicione uma regra de rewrite:

- **Source**: `/*`
- **Destination**: `/index.html`

⚠️ **Nota**: Se você estiver usando o arquivo `render.yaml`, essa configuração já está incluída automaticamente.

### Passo 6: Fazer Deploy

1. Clique em **"Create Static Site"**
2. O Render começará a:
   - Instalar as dependências
   - Executar o build
   - Fazer upload dos arquivos
3. Aguarde alguns minutos (geralmente 2-5 minutos)
4. Quando concluído, você verá uma URL como: `https://vistoria-smart-finder.onrender.com`

### Passo 7: Verificar o Deploy

1. Acesse a URL fornecida pelo Render
2. Teste as funcionalidades:
   - Página inicial
   - Busca de empresas
   - Página de administração
3. Verifique o console do navegador para erros

---

## 🎯 Opção 2: Deploy usando render.yaml (Recomendado)

### Passo 1: Certificar que render.yaml está no repositório

O arquivo `render.yaml` já está incluído no projeto. Certifique-se de que ele está commitado:

```bash
git add render.yaml
git commit -m "Add Render configuration"
git push
```

### Passo 2: Criar Blueprint no Render

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Clique em **"New +"** → **"Blueprint"**
3. Selecione seu repositório e branch
4. O Render detectará automaticamente o arquivo `render.yaml`
5. Clique em **"Apply"**

### Passo 3: Configurar Variáveis de Ambiente

Antes de aplicar o blueprint, configure as variáveis de ambiente na interface do Render:

1. Na seção de variáveis de ambiente, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY` (opcional)
   - `NODE_VERSION` = `18.20.4`

### Passo 4: Aplicar o Blueprint

1. Clique em **"Apply"**
2. Aguarde o deploy completar
3. Acesse a URL fornecida

---

## 🔧 Troubleshooting (Solução de Problemas)

### Erro: "Build failed"

**Possíveis causas e soluções:**

1. **Dependências não instaladas**
   - Verifique se o comando `npm install` está no build command
   - Tente limpar o cache: adicione `rm -rf node_modules && npm install` no build command

2. **Erro de tipo TypeScript**
   - Execute `npm run build` localmente para verificar erros
   - Corrija os erros antes de fazer push

3. **Variáveis de ambiente faltando**
   - Verifique se todas as variáveis obrigatórias estão configuradas
   - As variáveis `VITE_*` só são disponíveis no build, não em runtime

### Erro: "404 Not Found" ao navegar entre páginas

**Causa**: React Router precisa que todas as rotas sejam redirecionadas para `index.html`.

**Solução**: Certifique-se de que o rewrite está configurado:
- Source: `/*`
- Destination: `/index.html`

Isso já está configurado no `render.yaml`. Se estiver fazendo deploy manual, adicione essa configuração.

### Erro: Variáveis de ambiente não funcionam

**Causa**: Variáveis `VITE_*` são incluídas no build, não em runtime.

**Solução**: 
- Certifique-se de configurar as variáveis **ANTES** de fazer o build
- Se alterou as variáveis depois, você precisa fazer um novo deploy

### Erro: "Module not found" ou erros de importação

**Possíveis causas:**

1. **Caminhos de alias não funcionando**
   - Verifique se o `vite.config.ts` está configurado corretamente
   - O alias `@` deve apontar para `./src`

2. **Arquivos não commitados**
   - Verifique se todos os arquivos necessários estão no repositório
   - Não inclua `node_modules` no git

### Erro de conexão com Supabase

**Possíveis causas:**

1. **URL ou chave incorreta**
   - Verifique se as variáveis estão configuradas corretamente no Render
   - Confirme que está usando a chave **anon public**, não a chave secreta

2. **CORS não configurado**
   - No Supabase, vá em **Settings** → **API**
   - Adicione a URL do Render na lista de URLs permitidas

---

## 🔄 Atualizando o Deploy

Sempre que você fizer alterações no código:

1. Faça commit e push das alterações:
   ```bash
   git add .
   git commit -m "Descrição das alterações"
   git push
   ```

2. O Render detectará automaticamente as mudanças e iniciará um novo deploy

3. Você pode acompanhar o progresso no dashboard do Render

---

## 💡 Dicas e Boas Práticas

### 1. Custom Domain (Domínio Personalizado)

Para usar seu próprio domínio:

1. No dashboard do Render, vá em **Settings** → **Custom Domains**
2. Adicione seu domínio
3. Siga as instruções para configurar o DNS

### 2. Preview Deploys

O Render oferece deploys automáticos para pull requests:

1. No **Settings** do seu serviço, ative **"Auto-Deploy"**
2. Configure para fazer deploy de pull requests
3. Cada PR terá sua própria URL de preview

### 3. Monitoramento

- Acesse o dashboard do Render para ver logs em tempo real
- Configure alertas para falhas de deploy
- Monitore o uso de recursos no plano gratuito

### 4. Otimizações de Performance

- O Vite já otimiza automaticamente o build
- Imagens e assets são servidos com cache headers
- Considere usar CDN para assets estáticos

### 5. Segurança

- **Nunca** commite o arquivo `.env` no git
- Use apenas a chave **pública** do Supabase (anon key), nunca a secreta
- Configure restrições de API no Google Cloud Console
- Use HTTPS (já incluído automaticamente no Render)

---

## 📊 Status do Deploy

Você pode verificar o status do deploy no dashboard do Render:

- 🟢 **Live**: Deploy concluído e funcionando
- 🟡 **Building**: Build em andamento
- 🔴 **Failed**: Build falhou (veja os logs para detalhes)

---

## 🆘 Precisa de Ajuda?

- **Documentação do Render**: [https://render.com/docs](https://render.com/docs)
- **Suporte do Render**: [https://render.com/support](https://render.com/support)
- **Logs do Deploy**: Acesse o dashboard do Render → seu serviço → aba "Logs"

---

## ✅ Checklist Final

Antes de fazer deploy, certifique-se de que:

- [ ] Código está commitado e pushado no Git
- [ ] Build funciona localmente (`npm run build`)
- [ ] Variáveis de ambiente estão prontas (Supabase URL e Key)
- [ ] `render.yaml` está no repositório (se usar blueprint)
- [ ] Todas as dependências estão no `package.json`
- [ ] Não há erros no console ao rodar `npm run dev` localmente

---

**Boa sorte com o deploy! 🚀**


