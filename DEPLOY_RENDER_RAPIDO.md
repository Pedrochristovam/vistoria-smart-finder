# ⚡ Guia Rápido: Deploy no Render

## 🚀 Deploy em 5 minutos

### Passo 1: Preparar o código
```bash
# Certifique-se de que tudo está commitado
git add .
git commit -m "Prepare for Render deploy"
git push
```

### Passo 2: Criar conta no Render
1. Acesse [https://render.com](https://render.com)
2. Crie uma conta (pode usar GitHub/GitLab)
3. Faça login no dashboard

### Passo 3: Criar Static Site
1. Clique em **"New +"** → **"Static Site"**
2. Conecte seu repositório `vistoria-smart-finder`
3. Configure:
   - **Name**: `vistoria-smart-finder`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

### Passo 4: Configurar Variáveis de Ambiente
No dashboard do Render, adicione estas variáveis:

**Obrigatórias:**
- `VITE_SUPABASE_URL` - URL do seu projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Chave pública do Supabase

**Opcionais:**
- `VITE_GOOGLE_MAPS_API_KEY` - Chave da API do Google Maps

### Passo 5: Fazer Deploy
1. Clique em **"Create Static Site"**
2. Aguarde 2-5 minutos
3. Acesse a URL fornecida: `https://vistoria-smart-finder.onrender.com`

### ✅ Pronto!

---

## 📝 Notas Importantes

- As variáveis de ambiente `VITE_*` são incluídas **no build**, não em runtime
- Se alterar variáveis depois, precisa fazer novo deploy
- O React Router já está configurado com rewrite automático
- O Render oferece HTTPS gratuito automaticamente

---

## 🆘 Problemas?

Consulte o **[guia completo](./DEPLOY_RENDER.md)** para:
- Instruções detalhadas
- Solução de problemas comuns
- Dicas de otimização
- Configuração avançada

---

## 📚 Links Úteis

- [Dashboard Render](https://dashboard.render.com)
- [Documentação Render](https://render.com/docs)
- [Guia Completo](./DEPLOY_RENDER.md)


