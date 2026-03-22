# Training Models

Este projeto agora inclui um script generico para treinar qualquer familia YOLO que exista em `ai_model/model/`.

## Script principal

Use:

```powershell
cd demoviefy-backend
python scripts/train_yolo.py --data ..\datasets\meu_dataset\data.yaml --task object_detection --size n --epochs 80
```

## Tarefas suportadas

- `object_detection`
- `image_classification`
- `instance_segmentation`
- `oriented_bounding_boxes`
- `pose_estimation`

## Exemplos

Deteccao de objetos:

```powershell
python scripts/train_yolo.py --data ..\datasets\meu_dataset\data.yaml --task object_detection --size s --name detector-spo
```

Segmentacao:

```powershell
python scripts/train_yolo.py --data ..\datasets\meu_dataset\data.yaml --task instance_segmentation --size m --epochs 120
```

Pose:

```powershell
python scripts/train_yolo.py --data ..\datasets\meu_dataset\data.yaml --task pose_estimation --size n
```

Modelo explicito:

```powershell
python scripts/train_yolo.py --data ..\datasets\meu_dataset\data.yaml --model ..\ai_model\model\Object_Detection\yolo26l.pt
```

## Como preparar o dataset

1. Organize as imagens e labels no formato esperado pelo Ultralytics.
2. Crie um `data.yaml` com caminhos de treino, validacao e nomes das classes.
3. Comece com `--size n` ou `--size s` para validar o pipeline mais rapido.
4. Quando o treino estabilizar, aumente epocas, resolucao ou tamanho do modelo.

## Dica pratica

Se voce quer melhorar o modelo usado hoje no app, comece por `object_detection`, porque esse e o fluxo de IA mais maduro na interface atual. Quando sair um `best.pt`, voce pode apontar o frontend/backend para ele escolhendo o modelo na tela ou definindo `FRAME_AI_MODEL`.
