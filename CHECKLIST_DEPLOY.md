# ✅ Checklist de Deploy no Render

Use este checklist para garantir que tudo está pronto para o deploy.

## 📋 Pré-Deploy

### Código
- [ ] Código está commitado e pushado no Git
- [ ] Não há erros ao executar `npm run build` localmente
- [ ] Não há erros no console ao executar `npm run dev`
- [ ] Todos os arquivos necessários estão no repositório

### Arquivos de Configuração
- [ ] Arquivo `render.yaml` está no repositório
- [ ] Arquivo `.env` está no `.gitignore` (NÃO commitado)
- [ ] Arquivo `DEPLOY_RENDER.md` está no repositório (documentação)

### Variáveis de Ambiente
Antes de fazer deploy, tenha em mãos:

- [ ] **VITE_SUPABASE_URL** - URL do projeto Supabase
  - Onde encontrar: Supabase Dashboard → Settings → API → Project URL
  
- [ ] **VITE_SUPABASE_PUBLISHABLE_KEY** - Chave pública do Supabase
  - Onde encontrar: Supabase Dashboard → Settings → API → anon public key
  
- [ ] **VITE_GOOGLE_MAPS_API_KEY** (opcional) - Chave da API do Google Maps
  - Onde encontrar: Google Cloud Console → Credenciais → Criar chave de API

---

## 🚀 Deploy no Render

### Configuração Inicial
- [ ] Criei conta no Render: [https://render.com](https://render.com)
- [ ] Conectei meu repositório Git ao Render
- [ ] Selecionei o repositório `vistoria-smart-finder`
- [ ] Escolhi a branch `main` (ou sua branch principal)

### Configuração do Static Site
- [ ] **Name**: `vistoria-smart-finder` (ou nome de sua preferência)
- [ ] **Branch**: `main`
- [ ] **Build Command**: `npm install && npm run build`
- [ ] **Publish Directory**: `dist`

### Variáveis de Ambiente no Render
Configurei no dashboard do Render:

- [ ] `VITE_SUPABASE_URL` = URL do meu projeto Supabase
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = Chave pública do Supabase
- [ ] `VITE_GOOGLE_MAPS_API_KEY` = Chave do Google Maps (se usar)
- [ ] `NODE_VERSION` = `18.20.4` (opcional, mas recomendado)

### Rotas (React Router)
- [ ] Configurado rewrite: `/*` → `/index.html`
  - Isso já está no `render.yaml`, mas verifique no dashboard

### Deploy
- [ ] Cliquei em **"Create Static Site"**
- [ ] Acompanhei o build nos logs
- [ ] Build concluído com sucesso (status: Live)
- [ ] Recebi a URL do site: `https://vistoria-smart-finder.onrender.com`

---

## ✅ Pós-Deploy

### Verificação
- [ ] Site está acessível pela URL fornecida
- [ ] Página inicial carrega corretamente
- [ ] Busca de empresas funciona
- [ ] Página de administração funciona
- [ ] Navegação entre páginas funciona (sem erro 404)
- [ ] Conexão com Supabase funciona (verifique no console do navegador)
- [ ] Google Maps funciona (se configurado)

### Testes
- [ ] Testei busca de vistoria
- [ ] Testei visualização de resultados
- [ ] Testei acesso à área administrativa
- [ ] Verifiquei console do navegador (F12) - sem erros críticos

---

## 🔧 Se algo deu errado

### Build falhou
- [ ] Verifiquei os logs de build no Render
- [ ] Executei `npm run build` localmente para verificar erros
- [ ] Verifiquei se todas as dependências estão no `package.json`

### Site não carrega
- [ ] Verifiquei se as variáveis de ambiente estão configuradas
- [ ] Verifiquei se o build foi concluído com sucesso
- [ ] Verifiquei os logs de erro no dashboard do Render

### Erro 404 ao navegar
- [ ] Verifiquei se o rewrite está configurado: `/*` → `/index.html`
- [ ] Se estiver usando `render.yaml`, ele já inclui isso

### Erro de conexão com Supabase
- [ ] Verifiquei se `VITE_SUPABASE_URL` está correto
- [ ] Verifiquei se `VITE_SUPABASE_PUBLISHABLE_KEY` está correto
- [ ] Verifiquei se estou usando a chave **anon public**, não a secreta
- [ ] Verifiquei se a URL do Render está permitida no Supabase (CORS)

---

## 📚 Documentação

- [ ] Li o guia completo: [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)
- [ ] Li o guia rápido: [DEPLOY_RENDER_RAPIDO.md](./DEPLOY_RENDER_RAPIDO.md)
- [ ] Se necessário, consultei a documentação do Render: [https://render.com/docs](https://render.com/docs)

---

## 🎉 Tudo pronto!

Se todas as verificações estão marcadas, seu deploy está completo!

**URL do site**: `https://vistoria-smart-finder.onrender.com`

**Próximos passos**:
- Compartilhe a URL com seus usuários
- Configure um domínio personalizado (opcional)
- Configure alertas de monitoramento (opcional)
- Configure preview deploys para pull requests (opcional)

---

**Boa sorte com o deploy! 🚀**


