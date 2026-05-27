import zipfile
import gdown
import os

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
