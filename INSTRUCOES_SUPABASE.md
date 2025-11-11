# Como Configurar o Supabase

## Passo 1: Criar Projeto no Supabase

1. Acesse: https://app.supabase.com
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Name**: Nome do seu projeto (ex: "vistoria-smart-finder")
   - **Database Password**: Crie uma senha forte (anote ela!)
   - **Region**: Escolha a região mais próxima (ex: South America)
5. Clique em "Create new project"
6. Aguarde alguns minutos enquanto o projeto é criado

## Passo 2: Obter as Credenciais

1. No painel do Supabase, vá em **Settings** (ícone de engrenagem)
2. Clique em **API**
3. Você verá:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon public** key (uma chave longa)

## Passo 3: Configurar o arquivo .env

1. Abra o arquivo `.env` na raiz do projeto
2. Adicione as seguintes linhas:

```env
VITE_GOOGLE_MAPS_API_KEY=AIzaSyA7HpbNWxPTv7UQIVVQfuf4sF026JU_Mng

VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua-chave-anon-public-aqui
```

**Substitua:**
- `https://seu-projeto.supabase.co` pelo **Project URL** do passo 2
- `sua-chave-anon-public-aqui` pela chave **anon public** do passo 2

## Passo 4: Executar as Migrations

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Copie e cole o conteúdo do arquivo: `supabase/migrations/20251111123622_e10b9ea2-0bb3-4c8c-956c-f8215c731edf.sql`
4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Aguarde a confirmação de sucesso

6. Agora execute a segunda migration: `supabase/migrations/20250112000000_add_coordinates_to_empresas.sql`
   - Copie o conteúdo do arquivo
   - Cole no SQL Editor
   - Clique em **Run**

## Passo 5: Reiniciar o Servidor

1. Pare o servidor (Ctrl+C no terminal)
2. Execute novamente: `npm run dev`
3. Recarregue a página no navegador

## Pronto! 🎉

Agora você pode:
- ✅ Cadastrar empresas
- ✅ Buscar empresas
- ✅ Ver histórico de chamadas
- ✅ Usar todas as funcionalidades

## Verificação

Para verificar se está funcionando:
1. Vá em **Table Editor** no Supabase
2. Você deve ver as tabelas: `empresas`, `servicos`, `estados`, etc.
3. Tente cadastrar uma empresa no sistema

