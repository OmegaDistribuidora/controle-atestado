# Controle de Atestados

Sistema web para controle de atestados medicos com perfis `admin` e `rh`, dashboard com KPIs, filtros, anexos e painel anual de analises.

## Tecnologias

- Backend: Node.js + Express + Prisma + PostgreSQL
- Frontend: React + Vite
- Banco: PostgreSQL (Railway)
- Arquivos anexos: volume Railway em `/anexos`

> Os usuarios sao criados automaticamente na inicializacao (upsert).

## Requisitos

- Node.js 20+
- PostgreSQL

## Configuracao local

1. Copie `.env.example` para `.env` e ajuste `DATABASE_URL` e `JWT_SECRET`.
2. Instale as dependencias:

```bash
npm install
```

3. Gere o client Prisma e sincronize schema:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Rode em desenvolvimento (backend + frontend):

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`

## Deploy no Railway

1. Crie o projeto no Railway e conecte este repositorio.
2. Adicione plugin PostgreSQL.
3. Crie um volume e monte em `/anexos`.
4. Configure variaveis de ambiente:

- `DATABASE_URL` (fornecida pelo PostgreSQL do Railway)
- `JWT_SECRET` (uma chave forte)
- `ATTACHMENTS_DIR=/anexos`
- `SEED_ADMIN_PASSWORD=Omega@123`
- `SEED_RH_PASSWORD=Carlos@123`

5. O projeto ja possui `railway.toml` com comandos de build/start.

## Funcionalidades implementadas

- Login por usuario e senha com JWT
- Perfis `ADMIN` e `RH`
- Admin cria novos usuarios
- Dashboard com:
  - Mensagem de boas-vindas
  - KPIs: total atestados, total dias, funcionarios afastados hoje
  - Ultimos 20 lancamentos com filtro
- CRUD de atestados:
  - Campos: data inicial/final, data registro automatica (Fortaleza), nome, CPF, CID, dias totais
  - Obrigatorios: nome, CPF, data inicial
  - Calculo automatico de dias e retorno previsto
  - Ate 3 anexos por atestado (PDF/imagem)
  - Edicao por icone de caneta
- Pagina de todos os atestados com filtros e paginacao
- Painel de analises com calendario anual e destaque laranja para dias com afastados

## Observacoes tecnicas

- Os anexos sao gravados no diretorio definido em `ATTACHMENTS_DIR`.
- No banco sao salvos apenas os nomes dos anexos.
- Registro de atestado usa timezone `America/Fortaleza`.
