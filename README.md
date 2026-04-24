# DeMoviefy

![License](https://img.shields.io/badge/license-MIT-green)

Monorepo para upload, analise e acompanhamento de videos com backend Flask, frontend React e pipeline YOLO.

## Estrutura

- `demoviefy-backend/`: API Flask, persistencia e processamento
- `demoviefy-front/`: interface React para upload, biblioteca e visualizacao da analise
- `ai_model/`: modelo YOLO, app de teste e utilitarios de IA
- `docs/`: instrucoes complementares
- `uploads/`: videos enviados e arquivos de analise gerados em tempo de execucao
- `run_form.py`: launcher principal, multiplataforma, capaz de criar ou reparar a `.venv`

## Arquitetura

### Backend Flask MVC

- `app/controllers/`: entrada HTTP
- `app/services/`: regras de negocio, autenticacao, IA e validacoes
- `app/repositories/`: acesso a dados
- `app/models/`: modelos SQLAlchemy
- `app/routes/`: blueprints e rotas
- `app/config/`: configuracoes e paths compartilhados

### Frontend React

- `src/pages/Home/`: landing page publica
- `src/pages/Guest/`: modo convidado
- `src/pages/Login/`: login admin
- `src/pages/Upload/`: laboratorio admin
- `src/features/auth/`: contexto, integracao com backend e guardas de rota
- `src/features/videos/`: fluxo tecnico de videos, fila, transcricao e analise

## Autenticacao e seguranca

Autenticacao e dados privados nao ficam mais no front. A seguranca agora segue o backend:

- Usuarios sao persistidos no banco SQLite com `username`, `email`, `password_hash` e `is_admin`
- Senhas usam hash no backend com Werkzeug
- Sessao usa cookie HTTP-only
- Rotas administrativas do laboratorio sao protegidas no servidor
- O front apenas consome `/auth/login`, `/auth/logout` e `/auth/me`

### Variaveis de ambiente do backend

Defina em `demoviefy-backend/.env` com base em `demoviefy-backend/.env.example`:

```env
DEMOVIEFY_SECRET_KEY=change-this-in-production
DEMOVIEFY_ADMIN_USERNAME=admin
DEMOVIEFY_ADMIN_EMAIL=admin@demoviefy.local
DEMOVIEFY_ADMIN_PASSWORD=admin123
DEMOVIEFY_FRONTEND_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

Observacoes:

- Em desenvolvimento, o backend cria automaticamente o admin inicial se nao houver nenhum administrador no banco.
- Em producao, troque todas as credenciais e a `SECRET_KEY`.

## Funcionalidades de usuario

- Enviar videos para analise
- Escolher modelos dentre os disponibilizados pelo sistema
- Configurar parametros de analise
- Visualizar status do processamento
- Navegar por resultados, timestamps e transcricoes
- Reprocessar com novos parametros
- Baixar resultados quando aplicavel

## Funcionalidades exclusivas de administrador

- Controlar modelos disponiveis
- Restringir modelos por custo ou desempenho
- Definir limites de processamento
- Bloquear configuracoes invalidas ou perigosas
- Monitorar uso, erros e comportamento operacional
- Gerenciar acesso a areas sensiveis

## Regra de negocio central

- O usuario escolhe apenas entre modelos liberados pelo sistema
- Parametros invalidos devem ser bloqueados automaticamente
- Configuracoes nao podem comprometer desempenho ou seguranca
- Modelos mais pesados podem ter restricoes de uso
- O administrador governa limites e disponibilidade

## Fluxo rapido

### Launcher

Windows PowerShell:

```powershell
python run_form.py
```

Depois clique em:

1. `Setup Environment` (primeira vez apenas)
2. `Start All` (inicia backend + frontend)

Com proxy da escola:

```powershell
python run_form.py --proxy http://proxy.spo.ifsp.edu.br:3128
```

### Execucao manual

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r demoviefy-backend/requirements.txt
```

Frontend:

```powershell
cd demoviefy-front
npm install
npm run dev
```

Backend:

```powershell
cd demoviefy-backend
python run.py
```

## Organizacao interna

Backend Flask:

- `demoviefy-backend/app/controllers/`: entrada HTTP
- `demoviefy-backend/app/services/`: regras de negocio e IA
- `demoviefy-backend/app/repositories/`: acesso a dados
- `demoviefy-backend/app/config/`: configuracoes e paths compartilhados

Frontend React:

- `demoviefy-front/src/features/videos/`: fluxo principal de upload e inspecao
- `demoviefy-front/src/components/`: cabecalho e rodape
- `demoviefy-front/src/layouts/`: estrutura visual da aplicacao
- `demoviefy-front/src/services/`: cliente HTTP

## Observacoes

- O backend usa `ai_model/model/yolo26l.pt` automaticamente quando esse arquivo existe.
- A transcricao automatica com timestamps usa Whisper quando instalado.
- O modo convidado atual e uma experiencia publica de exploracao; historico persistente de usuario ainda depende da evolucao da autenticacao completa para perfis nao-admin.
- `docs/RUN_INSTRUCTIONS.md`, `docs/FRAME_AI.md` e `docs/TRAINING_MODELS.md` continuam como referencia operacional.
