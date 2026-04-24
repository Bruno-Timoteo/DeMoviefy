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

## Onde os arquivos ficam

- Video enviado: `uploads/<nome-do-arquivo>`
- Resumo da analise: `uploads/analysis/video_<id>.json`
- Banco SQLite local: `demoviefy-backend/instance/demoviefy.db`

O frontend agora mostra esses caminhos diretamente no painel de detalhes, junto com o preview do video e o status do processamento.

## Quick Start

### Com o Launcher (Recomendado)

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

Ou manualmente:

```powershell
python run_form_proxy.py
```

### Execução Manual

**Setup Python:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r demoviefy-backend/requirements.txt
```

**Backend:**

```powershell
cd demoviefy-backend
python run.py
```

Acesse: `http://127.0.0.1:5000`

**Frontend (em outro terminal):**

```powershell
cd demoviefy-front
npm install
npm run dev
```

Acesse: `http://localhost:5173`

## Fluxo de Upload

1. Envie o video pela interface
2. Backend salva em `uploads/`
3. Thread de processamento executa analise com YOLO
4. Resumo final vai para `uploads/analysis/video_<id>.json`
5. Preview anotado vai para `uploads/annotated/video_<id>.mp4`
6. Interface mostra preview, status e caminhos dos artefatos

## Configurações

- `PROXY_URL`: proxy HTTP/HTTPS para pip, npm e subprocessos
- `FRAME_AI_MODEL`: caminho alternativo para modelo YOLO
- `FRAME_AI_FRAME_STRIDE`: intervalo de frames amostrados
- `FRAME_AI_CONFIDENCE`: confianca minima da deteccao
- `FRAME_AI_MAX_FRAMES`: limite de frames processados

## Transcrição Automática

O sistema gera transcrição automatica com timestamps apos processamento. Recomendado:

```powershell
.\.venv\Scripts\python -m pip install -r demoviefy-backend/requirements-transcription.txt
```

> **Importante**: Manter `torch==2.11.0` e `torchvision==0.26.0` para compatibilidade.

## Documentação Adicional

- [Organização de Código](CODE_ORGANIZATION_GUIDE.md) - Arquitetura MVC do backend e frontend
- [Guia de Contribuição](CONTRIBUTING.md) - Como contribuir com o projeto
- [IA & Frame Processing](docs/FRAME_AI.md) - Detalhes do pipeline de IA
- [Treinamento de Modelos](docs/TRAINING_MODELS.md) - Como treinar novos modelos YOLO

O launcher pode ser iniciado com o Python do sistema, mesmo sem `.venv`. Ao clicar em `Setup Environment`, ele cria ou repara o ambiente automaticamente.

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
- A transcricao automatica com timestamps usa Whisper quando instalado; prefira Python 3.11/3.12 para esse recurso.
- Para evitar conflitos de dependencias, o `demoviefy-backend/requirements-transcription.txt` usa `torch==2.11.0` e o launcher faz um ajustamento de `torchvision` quando necessario.
- Se o launcher for iniciado dentro de um debugger, ele remove variaveis de debug dos subprocessos para evitar o erro de `__firstlineno__` no SQLAlchemy.
- `docs/RUN_INSTRUCTIONS.md`, `docs/FRAME_AI.md` e `docs/TRAINING_MODELS.md` continuam como referencia de execucao e da pipeline de IA.
