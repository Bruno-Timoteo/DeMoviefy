# DeMoviefy

![License](https://img.shields.io/badge/license-MIT-green)

Monorepo para upload, analise e acompanhamento de videos com backend Flask em MVC, frontend React e pipeline de IA para transcricao e visao computacional.

## Visao geral do produto

O DeMoviefy agora esta organizado em tres experiencias:

- Homepage publica: apresenta o que a plataforma faz, tecnologias usadas, modelo de negocio e diferenciadores.
- Modo convidado (`/guest`): permite explorar a interface sem login.
- Area administrativa (`/admin/lab`): protegida por autenticacao no backend, usada para testes tecnicos, configuracoes sensiveis e governanca.

## Estrutura

- `demoviefy-backend/`: API Flask, autenticacao, persistencia e processamento
- `demoviefy-front/`: interface React para homepage, guest mode, login e laboratorio admin
- `ai_model/`: utilitarios e artefatos de IA
- `docs/`: instrucoes complementares
- `uploads/`: videos e artefatos gerados em tempo de execucao
- `run_form.py`: launcher principal, capaz de criar ou reparar a `.venv`

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
.\run_form.ps1
```

Linux:

```bash
./run_form.sh
```

Com proxy:

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

## Onde os arquivos ficam

- Video enviado: `uploads/<nome-do-arquivo>`
- Resumo da analise: `uploads/analysis/video_<id>.json`
- Banco SQLite local: `demoviefy-backend/instance/demoviefy.db`

## Observacoes

- O backend usa `ai_model/model/yolo26l.pt` automaticamente quando esse arquivo existe.
- A transcricao automatica com timestamps usa Whisper quando instalado.
- O modo convidado atual e uma experiencia publica de exploracao; historico persistente de usuario ainda depende da evolucao da autenticacao completa para perfis nao-admin.
- `docs/RUN_INSTRUCTIONS.md`, `docs/FRAME_AI.md` e `docs/TRAINING_MODELS.md` continuam como referencia operacional.
