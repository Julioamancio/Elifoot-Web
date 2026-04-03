# FutBoss

Versão web inspirada nos clássicos managers de futebol, com modo carreira de técnico e jogador, calendário, mercado, finanças, competições nacionais e internacionais, além de persistência local com múltiplos slots de save por usuário.

## Stack

- React 19 + Vite
- Express
- SQLite local com `better-sqlite3`
- Zustand para estado global
- Autenticação manual com usuário e senha

## Como rodar

Pré-requisito: Node.js 20+

1. Instale as dependências com `npm install`
2. Copie `.env.example` para `.env.local` ou `.env`
3. Inicie o projeto com `npm run dev`
4. Acesse [http://localhost:3000](http://localhost:3000)

## Scripts úteis

- `npm run dev`: inicia front e backend juntos
- `npm run build`: gera build de produção
- `npm run lint`: valida TypeScript sem emitir arquivos
- `npm run test:regression`: executa a suíte leve de regressão

## Banco de dados

O projeto cria automaticamente um banco SQLite em `data/elifoot.sqlite`.

## Autenticação e saves

- O login é local, com criação manual de usuário e senha
- Cada usuário pode manter várias carreiras independentes
- Cada slot de save mostra um resumo com modo, time, temporada e semana atual
- Não há mais dependência ativa de Firebase para autenticação ou persistência

## Estado atual do jogo

O projeto já inclui:

- carreira de técnico e de jogador
- ligas nacionais, regionais, copa nacional e torneios continentais
- World Cup e Olympics no calendário
- patrocínio, comercial, base, contratos, aposentadoria e regen
- mercado, renovação, notícias, agenda e resumo de rodada
