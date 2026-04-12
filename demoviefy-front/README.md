# DeMoviefy Frontend

Frontend do projeto DeMoviefy, desenvolvido com React, TypeScript, Vite e Tailwind CSS.

## O que existe hoje

- Landing page publica em `/`
- Modo convidado em `/guest`
- Login admin em `/login`
- Laboratorio admin protegido em `/admin/lab`

## Objetivo do frontend

O frontend foi reorganizado para separar tres experiencias:

- Apresentacao institucional do produto
- Exploracao publica sem login
- Operacao tecnica e administrativa autenticada

## Como rodar

```bash
cd demoviefy-front
npm install
npm run dev
```

Build de producao:

```bash
npm run build
```

## Integracao com backend

O frontend consome a API Flask e depende principalmente de:

- `/auth/login`
- `/auth/logout`
- `/auth/me`
- `/videos`
- `/videos/:id/analysis`
- `/videos/:id/transcription`
- `/ai/models`

A autenticacao usa sessao no backend com `withCredentials: true` no cliente HTTP.

## Estrutura principal

- `src/app/`: roteamento principal
- `src/layouts/`: shell visual da aplicacao
- `src/components/`: header e footer
- `src/pages/Home/`: homepage publica
- `src/pages/Guest/`: modo convidado
- `src/pages/Login/`: login admin
- `src/pages/Upload/`: laboratorio admin
- `src/features/auth/`: autenticacao e protecao de rotas
- `src/features/videos/`: biblioteca, fila, badges, workbench e dashboard tecnico

## Observacao importante

O modo convidado atual e uma experiencia publica de exploracao da plataforma. Persistencia completa de historico para usuarios comuns ainda depende da evolucao da camada de contas alem do perfil administrativo.
