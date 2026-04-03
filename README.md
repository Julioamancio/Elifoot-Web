# Elifoot Web

Versão web inspirada no Elifoot, com modo carreira de manager e jogador.

## Stack atual

- React 19 + Vite
- Express
- SQLite local com `better-sqlite3`
- Autenticação manual com usuário e senha

## Como rodar

**Pré-requisito:** Node.js

1. Instale as dependências:
   `npm install`
2. Copie `.env.example` para `.env.local` ou `.env`
3. Inicie o projeto:
   `npm run dev`
4. Acesse:
   `http://localhost:3000`

## Banco de dados

O projeto cria automaticamente um banco SQLite em `data/elifoot.sqlite`.

## Autenticação e saves

- O login agora é local, com criação manual de usuário e senha
- Os saves do jogo ficam associados ao usuário no banco SQLite
- Não há mais dependência ativa de Firebase para autenticação ou persistência
