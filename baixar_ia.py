import zipfile
import os
import gdown

from run_form import AI_MODEL_FOLDER

def baixar_zip_google_drive(url, zip_name="ai_model.zip"):
    # Download
    print("Baixando arquivo...")
    gdown.download(url, zip_name)

    # Extração
    print("Extraindo arquivo...")
    with zipfile.ZipFile(zip_name, "r") as zip_ref:
        zip_ref.extractall()

    # Deletando zip extra

    if os.path.exists("ai_model.zip"):
        os.remove("ai_model.zip")
        print("Arquivo zip removido.")
    else:
        print("O arquivo não existe.")

    print("Concluído!")

if not (AI_MODEL_FOLDER).exists():
    baixar_zip_google_drive("https://drive.google.com/file/d/1WeTzxbnaqVZwxiJqX6c49vl9U73QPtbX/view?usp=sharing")
else:
    print("Modelos de IA já presentes")