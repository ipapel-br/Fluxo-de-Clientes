# Fluxo de Clientes

Aplicação em React + Vite para organizar demandas, atendimento e status com suporte a banco de dados em nuvem (**Supabase**) ou persistência local (**localStorage**).

---

## 🚀 Como rodar localmente

1. Instale as dependências:
   ```bash
   npm install
   ```

2. (Opcional) Configure o Supabase criando um arquivo `.env` baseado no `.env.example`:
   ```bash
   cp .env.example .env
   ```
   > Se o `.env` não for preenchido, a aplicação roda em modo local-first utilizando o `localStorage` automaticamente.

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 🗄️ Configuração do Supabase

1. Crie um projeto gratuito em [supabase.com](https://supabase.com).
2. No painel do seu projeto, acesse **SQL Editor** -> **New Query**.
3. Copie e cole todo o conteúdo do arquivo `supabase/schema.sql` e clique em **Run**.
4. Acesse **Project Settings** -> **API** e copie:
   - **Project URL** -> `VITE_SUPABASE_URL`
   - **anon / public key** -> `VITE_SUPABASE_ANON_KEY`

---

## ☁️ Deploy na Vercel

1. Suba este repositório para o seu GitHub.
2. Acesse [vercel.com](https://vercel.com) e importe o repositório.
3. Nas configurações do projeto na Vercel (**Environment Variables**), adicione:
   - `VITE_SUPABASE_URL`: sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY`: sua chave pública anônima do Supabase
4. Clique em **Deploy**. O arquivo `vercel.json` já está configurado para rotear todas as páginas (SPA) sem erros 404.

---

## 🛠️ Comandos disponíveis

- `npm run dev`: Servidor de desenvolvimento local
- `npm run build`: Gera o bundle de produção na pasta `dist/`
- `npm run lint`: Valida padrões de código com ESLint
- `npm run typecheck`: Valida tipos com TypeScript
