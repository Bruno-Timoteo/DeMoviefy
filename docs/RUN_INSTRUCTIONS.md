# DeMoviefy - Run Instructions

## Inicio rapido

Launcher com deteccao automatica de Python:

```powershell
.\run_form.ps1
```

No Linux:

```bash
./run_form.sh
```

Com proxy da escola:

```powershell
python run_form.py --proxy http://proxy.spo.ifsp.edu.br:3128
```

Ou:

```powershell
python run_form_proxy.py
```

Depois clique em:

- `Setup Environment`
- `Start All`

## Fluxo de upload

1. Envie o video pela interface.
2. O backend salva o arquivo em `uploads/`.
3. A thread de processamento executa a analise com YOLO.
4. O resumo final vai para `uploads/analysis/video_<id>.json`.
5. O preview anotado vai para `uploads/annotated/video_<id>.mp4`.
6. A pagina mostra preview original, preview anotado, status e caminhos dos artefatos.

## Execucao manual

### Python

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r demoviefy-backend/requirements.txt
```

### Backend

```powershell
cd demoviefy-backend
python run.py
```

Backend padrao:

- `http://127.0.0.1:5000`

### Frontend

```powershell
cd demoviefy-front
npm install
npm run dev
```

Frontend padrao:

- `http://localhost:5173`

## Variaveis uteis

- `PROXY_URL`: proxy HTTP/HTTPS para pip, npm e subprocessos do launcher
- `FRAME_AI_MODEL`: caminho alternativo para o modelo YOLO
- `FRAME_AI_FRAME_STRIDE`: intervalo de frames amostrados
- `FRAME_AI_CONFIDENCE`: confianca minima da deteccao
- `FRAME_AI_MAX_FRAMES`: limite de frames processados

## Transcricao automatica

O sistema agora tenta gerar transcricao automatica com timestamps apos o processamento do video e tambem oferece um botao manual na interface.

A transcricao agora é executada no mesmo ambiente virtual principal (`.venv`) por padrão (modo single-venv). A criacao de `.venv-transcription` não é mais obrigatoria, mas o launcher ainda oferece compatibilidade retroativa se ela existir.

> Importante: priorize manter `torch` na versao compatível com `ultralytics` (`2.11.0`) e `torchvision` com `0.26.0`.
> O arquivo `demoviefy-backend/requirements-transcription.txt` agora usa `torch==2.11.0` para evitar conflitos.

O launcher também valida após a instalação se há `torch`+`torchvision` compatíveis; se detectar conflito, tenta forcar `torchvision==0.26.0` e emite aviso.

Recomendado (single venv):
```
\.venv\Scripts\python -m pip install --upgrade pip
\.venv\Scripts\python -m pip install -r demoviefy-backend/requirements-transcription.txt
```

No Linux, use `.venv/bin/python`.

Sem o Whisper instalado, o restante da analise continua funcionando normalmente. A tela vai mostrar o status da transcricao e ainda permitira edicao manual.

## Troubleshooting

- Se a `.venv` estiver quebrada, o launcher recria durante `Setup Environment`.
- Se a transcricao automatica nao aparecer, confira se o pacote `openai-whisper` foi instalado no ven ambiente (`.venv`) e se a aplicacao foi reiniciada.
- Se algum upload parecer "sumido", abra o painel do video na interface: o caminho do arquivo e do JSON aparecem ali.
- Se `npm` ou `pip` precisarem do proxy da escola, use `--proxy http://proxy.spo.ifsp.edu.br:3128`.
