import zipfile
from pathlib import Path
import gdown
import sys


# Sem isso ele não consegue importar as variáveis de config

SETUP_DIR = Path(__file__).resolve().parent.parent
if str(SETUP_DIR) not in sys.path:
    sys.path.insert(0, str(SETUP_DIR))


from config import ROOT, AI_MODEL_FOLDER, AI_MODELS_DOWNLOAD_URL

def baixar_zip_google_drive(url=AI_MODELS_DOWNLOAD_URL):

    if not (AI_MODEL_FOLDER).exists():

        zip_name="ai_model.zip"
        zip_path = Path(zip_name)

        print("Baixando arquivo...")

        gdown.download(url, zip_name)

        # Extração

        print("Extraindo arquivos...")
        with zipfile.ZipFile(zip_name, "r") as zip_ref:
            zip_ref.extractall(ROOT)

        # Verifica se extraiu
            if not (AI_MODEL_FOLDER).exists():

                print("A pasta com os modelos de IA não foi encontrada.")
                return False

        # Deletando zip temporário

        if zip_path.exists():
            zip_path.unlink()
            print("Arquivo zip temporário removido.")
        else:
            print("O arquivo zip temporário não foi encontrado para remoção.")
            return False

        print("Concluído!")
        return True

    else:
        print("Modelos de IA já presentes")
        return False
    
if __name__ == "__main__":
    baixar_zip_google_drive()