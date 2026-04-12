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

Com proxy da escola:

```powershell
python run_form.py --proxy http://proxy.spo.ifsp.edu.br:3128
```

Ou use o atalho pronto:

```powershell
python run_form_proxy.py
```

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
- Se o launcher for iniciado dentro de um debugger, ele remove variaveis de debug dos subprocessos para evitar o erro de `__firstlineno__` no SQLAlchemy.
- `docs/RUN_INSTRUCTIONS.md`, `docs/FRAME_AI.md` e `docs/TRAINING_MODELS.md` continuam como referencia de execucao e da pipeline de IA.
