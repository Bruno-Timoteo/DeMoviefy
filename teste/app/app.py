import logging
from ultralytics import YOLO
import os
import time

# =========================
# Configuração do LOG
# =========================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),  # salva em arquivo
        logging.StreamHandler()          # mostra no terminal
    ]
)

logging.info("Iniciando aplicação YOLO...")

try:
    # =========================
    # Diretórios base relativos
    # =========================
    BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))  # 'teste/'
    IMAGE_PATH = os.path.join(BASE_DIR, "app", "assets", "train", "images", "monalisa.jpg")
    MODEL_PATH = os.path.join(BASE_DIR, "model", "yolo26l.pt")
    RUNS_DIR = BASE_DIR+"/results"  # resultados serão salvos dentro de 'teste/'

    # =========================
    # Verificar imagem
    # =========================
    if not os.path.exists(IMAGE_PATH):
        logging.error(f"Imagem não encontrada: {IMAGE_PATH}")
        raise FileNotFoundError(f"Arquivo {IMAGE_PATH} não existe.")

    # =========================
    # Verificar modelo
    # =========================
    if not os.path.exists(MODEL_PATH):
        logging.error(f"Modelo não encontrado: {MODEL_PATH}")
        raise FileNotFoundError(f"Arquivo {MODEL_PATH} não existe.")

    # =========================
    # Carregar modelo YOLO26L
    # =========================
    logging.info("Carregando modelo YOLO26L...")
    model = YOLO(MODEL_PATH)
    logging.info("Modelo carregado com sucesso!")

    # =========================
    # Iniciar detecção
    # =========================
    logging.info(f"Iniciando detecção na imagem: {IMAGE_PATH}")
    start_time = time.time()
    results = model(
        IMAGE_PATH,
        save=True,
        project=RUNS_DIR,
        name="detect_results"
    )
    end_time = time.time()
    processing_time = end_time - start_time

    # =========================
    # Processar resultados
    # =========================
    r = results[0]
    boxes = r.boxes
    total_detections = len(boxes)

    logging.info(f"Tempo de processamento: {processing_time:.2f} segundos")
    logging.info(f"Total de objetos detectados: {total_detections}")

    if total_detections > 0:
        class_names = r.names
        detected_classes = []
        confidences = []

        for box in boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            detected_classes.append(class_names[cls_id])
            confidences.append(conf)

        logging.info(f"Classes detectadas: {detected_classes}")
        logging.info(f"Confiança média: {sum(confidences)/len(confidences):.2f}")

    logging.info(f"Resultados salvos em {os.path.join(RUNS_DIR, 'detect_results')}")
    logging.info("Detecção concluída com sucesso!")

except Exception as e:
    logging.exception(f"Ocorreu um erro: {e}")

finally:
    logging.info("Finalizando aplicação.")