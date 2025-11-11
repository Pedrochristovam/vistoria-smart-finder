# Sistema de Vistorias - Gestão de Empresas Credenciadas

Sistema inteligente para automatizar a seleção de empresas credenciadas para vistorias de engenharia. Encontre a empresa ideal com base em localização, serviços e histórico.

## Como editar este código?

Você pode trabalhar localmente usando sua IDE preferida.

**Requisitos:**
- Node.js & npm instalados - [instalar com nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

**Passos para iniciar:**

```sh
# Passo 1: Clone o repositório
git clone https://github.com/Pedrochristovam/vistoria-smart-finder.git

# Passo 2: Navegue até o diretório do projeto
cd vistoria-smart-finder

# Passo 3: Instale as dependências necessárias
npm i

# Passo 4: Inicie o servidor de desenvolvimento
npm run dev
```

O servidor será iniciado em `http://localhost:8080` (ou outra porta se 8080 estiver em uso).

**Editar arquivos diretamente no GitHub**

- Navegue até o arquivo desejado
- Clique no botão "Edit" (ícone de lápis) no canto superior direito
- Faça suas alterações e faça commit

**Usar GitHub Codespaces**

- Navegue até a página principal do repositório
- Clique no botão "Code" (botão verde) no canto superior direito
- Selecione a aba "Codespaces"
- Clique em "New codespace" para iniciar um novo ambiente
- Edite arquivos diretamente no Codespace e faça commit e push quando terminar

## Tecnologias utilizadas

Este projeto é construído com:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Google Maps API (opcional, para autocompletar endereços e geocodificação)
- Supabase (banco de dados)

## Configuração do Google Maps API (Opcional)

Para habilitar o autocompletar de endereços e melhorar a precisão da geocodificação:

1. Copie o arquivo `.env.example` para `.env`:
   ```sh
   cp .env.example .env
   ```

2. Obtenha uma chave da API do Google Maps:
   - Acesse [Google Cloud Console](https://console.cloud.google.com/)
   - Crie um novo projeto ou selecione um existente
   - Ative as APIs necessárias:
     - **Geocoding API**
     - **Places API**
   - Crie uma chave de API em "Credenciais"
   - Configure restrições de aplicativo para segurança (recomendado)

3. Adicione a chave no arquivo `.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=sua_chave_aqui
   ```

**Nota:** Se a chave não for configurada, o sistema usará OpenStreetMap (Nominatim) como fallback, que é gratuito mas pode ser menos preciso.

## Como fazer deploy deste projeto?

Você pode fazer deploy usando qualquer plataforma de hospedagem que suporte aplicações React/Vite, como:

- Vercel
- Netlify
- GitHub Pages
- AWS Amplify
- Outras plataformas de sua preferência

Certifique-se de configurar as variáveis de ambiente necessárias (como `VITE_GOOGLE_MAPS_API_KEY`) na plataforma escolhida.
