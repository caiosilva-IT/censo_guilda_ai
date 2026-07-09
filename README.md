# Censo da Guilda de IA — versão self-hosted (Coolify + Google Sheets)

Essa versão troca o `window.storage` do artifact por um backend próprio
(Node/Express) que grava cada resposta direto numa aba do Google Sheets.
Resolve o problema de gente não conseguir abrir o artifact — aqui é só um
link normal, sem depender de sessão no Claude.ai.

## 1. Preparar a planilha do Google Sheets

1. Crie (ou reaproveite) uma planilha no Google Sheets.
2. Renomeie uma aba para `Respostas` (ou o nome que preferir — daí ajusta a
   env var `GOOGLE_SHEET_TAB`).
3. Na primeira linha, coloque o cabeçalho (opcional, mas ajuda a visualizar):
   ```
   ts | name | area | level | tools | focus | goal | blocker | suggestion
   ```
4. Copie o **ID da planilha** — é o trecho da URL entre `/d/` e `/edit`:
   `docs.google.com/spreadsheets/d/ESSE_TRECHO_AQUI/edit`

## 2. Criar a service account no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) e
   crie um projeto (ou use um existente).
2. Ative a **Google Sheets API** (menu "APIs e Serviços" → "Ativar APIs e
   Serviços" → busque "Google Sheets API" → Ativar).
3. Vá em "Credenciais" → "Criar Credenciais" → "Conta de serviço".
4. Dê um nome (ex: `censo-guilda-ia`) e conclua a criação.
5. Na aba "Chaves" da conta de serviço criada, clique em "Adicionar Chave" →
   "Criar nova chave" → formato **JSON**. Isso baixa um arquivo `.json`.
6. Abra o arquivo baixado — você vai precisar de dois campos dele:
   - `client_email` → vira `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → vira `GOOGLE_PRIVATE_KEY`
7. **Compartilhe a planilha** do passo 1 com o e-mail da service account
   (o `client_email`), dando permissão de **Editor**. Sem esse passo o
   backend não consegue gravar nada.

⚠️ Trate o arquivo `.json` da service account como um segredo — não commite
ele no repositório, não cole em canais do Slack, e não deixe em texto puro
em nenhum lugar fora das env vars do Coolify.

## 3. Rodar localmente (opcional, pra testar antes de subir)

```bash
cp .env.example .env
# preencha .env com os valores do passo 2
npm install
npm start
```

Abra `http://localhost:3000` e testa o formulário.

## 4. Deploy no Coolify

1. Suba esse projeto num repositório Git (GitHub/GitLab) que o Coolify
   consiga acessar, ou aponte o Coolify direto pro repo já usado nos outros
   projetos.
2. No Coolify, crie uma nova aplicação do tipo **Dockerfile** (ele vai
   detectar o `Dockerfile` na raiz do projeto automaticamente).
3. Configure as **variáveis de ambiente** da aplicação no Coolify:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY` (cole o valor com `\n` literal no lugar das quebras
     de linha — é assim que vem no JSON original, então normalmente só
     colar o valor de `private_key` já funciona)
   - `GOOGLE_SHEET_ID`
   - `GOOGLE_SHEET_TAB` (se quiser um nome diferente de `Respostas`)
4. A porta exposta é `3000` (já configurada no Dockerfile via `EXPOSE`).
5. Deploy. Depois de subir, o Coolify te dá a URL pública — esse é o link
   que substitui o artifact no `#guild_ia`.
6. Teste rapidinho enviando uma resposta e conferindo se a linha apareceu
   na planilha.

## 5. Migrando o que já tem no artifact

Como combinado: exporte o CSV de dentro do artifact atual (botão "Exportar
respostas (CSV)" na tela de resultados agregados) e cole as linhas
manualmente na aba `Respostas` da planilha, no mesmo formato de colunas
(`ts, name, area, level, tools, focus, goal, blocker, suggestion`). Depois
disso, todo mundo passa a responder só pelo link novo.

## Estrutura do projeto

```
censo-guilda-ia/
├── server.js          # backend Express: /api/submit e /api/results
├── package.json
├── Dockerfile
├── .env.example
└── public/
    └── index.html     # o formulário (mesmo visual, agora fala com o backend)
```
