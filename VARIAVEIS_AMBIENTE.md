# 🔐 Variáveis de Ambiente - Render

## ⚠️ IMPORTANTE

As variáveis `VITE_*` são **embutidas no build** em tempo de compilação. Isso significa que:
- Você **DEVE** configurá-las **ANTES** de fazer o deploy
- Se alterá-las depois, precisa fazer um **novo deploy**
- Elas não podem ser alteradas em runtime

## 📋 Variáveis Necessárias

Configure estas variáveis no dashboard do Render antes de fazer o deploy:

### ✅ Obrigatórias

#### 1. `VITE_SUPABASE_URL`
- **Descrição**: URL do seu projeto Supabase
- **Onde encontrar**: 
  - Acesse [https://supabase.com](https://supabase.com)
  - Entre no seu projeto
  - Vá em **Settings** → **API**
  - Copie o **Project URL**
- **Exemplo**: `https://xxxxxxxxxxxxx.supabase.co`

#### 2. `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Descrição**: Chave pública (anon key) do Supabase
- **Importante**: Use a chave **anon public**, NÃO a secret key!
- **Onde encontrar**:
  - Acesse [https://supabase.com](https://supabase.com)
  - Entre no seu projeto
  - Vá em **Settings** → **API**
  - Copie a chave **anon public** (não a service_role)
- **Exemplo**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### ⚠️ Nota sobre `VITE_SUPABASE_ANON_KEY`

O código usa `VITE_SUPABASE_PUBLISHABLE_KEY`, não `VITE_SUPABASE_ANON_KEY`.
- ❌ **Não use**: `VITE_SUPABASE_ANON_KEY`
- ✅ **Use**: `VITE_SUPABASE_PUBLISHABLE_KEY`

### 🔵 Opcionais

#### 3. `VITE_GOOGLE_MAPS_API_KEY`
- **Descrição**: Chave da API do Google Maps (para autocompletar endereços e melhorar geocodificação)
- **Onde encontrar**:
  - Acesse [Google Cloud Console](https://console.cloud.google.com/)
  - Crie ou selecione um projeto
  - Ative as APIs:
    - **Geocoding API**
    - **Places API**
  - Vá em **Credenciais** → **Criar credencial** → **Chave de API**
  - Copie a chave
- **Nota**: Se não configurada, o sistema usará OpenStreetMap (Nominatim) como fallback

## 🚀 Como Configurar no Render

1. Acesse o dashboard do Render: [https://dashboard.render.com](https://dashboard.render.com)
2. Selecione seu serviço (Static Site)
3. Vá em **Environment** (na barra lateral)
4. Clique em **Add Environment Variable**
5. Adicione cada variável:
   - **Key**: Nome da variável (ex: `VITE_SUPABASE_URL`)
   - **Value**: Valor da variável
6. Clique em **Save Changes**
7. **Importante**: Faça um novo deploy para aplicar as mudanças

## ✅ Verificação

Após configurar as variáveis e fazer o deploy, verifique:

1. **Console do navegador** (F12):
   - Não deve ter erros de conexão com Supabase
   - Se usar Google Maps, não deve ter erros de API

2. **Página de administração** (`/admin`):
   - Deve carregar corretamente
   - Deve conseguir listar empresas
   - Deve conseguir criar/editar empresas

3. **Página inicial** (`/`):
   - Deve conseguir fazer buscas
   - Deve mostrar resultados

## 🔧 Troubleshooting

### Erro: "Supabase connection failed"
- ✅ Verifique se `VITE_SUPABASE_URL` está correto
- ✅ Verifique se `VITE_SUPABASE_PUBLISHABLE_KEY` está correto
- ✅ Verifique se está usando a chave **anon public**, não a secret
- ✅ Certifique-se de fazer um novo deploy após configurar as variáveis

### Erro: "Google Maps API error"
- ✅ Verifique se `VITE_GOOGLE_MAPS_API_KEY` está configurada
- ✅ Verifique se as APIs estão ativadas no Google Cloud Console
- ✅ Verifique se a chave tem as permissões corretas
- ⚠️ Se não configurada, o sistema usará fallback (funcional, mas menos preciso)

### As variáveis não funcionam
- ⚠️ **Lembre-se**: Variáveis `VITE_*` são embutidas no build
- ✅ Se alterou as variáveis, precisa fazer um **novo deploy**
- ✅ Verifique se configurou as variáveis antes do build

## 📝 Resumo

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `VITE_SUPABASE_URL` | ✅ Sim | URL do projeto Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Sim | Chave pública (anon) do Supabase |
| `VITE_GOOGLE_MAPS_API_KEY` | ❌ Não | Chave da API do Google Maps |

---

**Importante**: Configure todas as variáveis **ANTES** do primeiro deploy!

