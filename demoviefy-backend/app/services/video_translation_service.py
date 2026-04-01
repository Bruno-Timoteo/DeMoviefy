import json
import srt
import os
import time
from datetime import timedelta
from deep_translator import GoogleTranslator
from transcription_service import payload

#True na escola | False em casa
USAR_PROXY = True

if USAR_PROXY:
    PROXY_CONFIG = {
        "http": "http://proxy.spo.ifsp.edu.br:3128",
        "https": "http://proxy.spo.ifsp.edu.br:3128"
    }
else:
    PROXY_CONFIG = None # Em casa, não usa proxy

# No momento de instanciar o tradutor:
translator = GoogleTranslator(source='auto', target='pt', proxies=PROXY_CONFIG)

def converter_para_srt(json_content):
    # Passamos os proxies para a instância do tradutor
    translator = GoogleTranslator(source='auto', target='pt', proxies=PROXY_CONFIG)
    subtitles = []
    
    segments = json_content.get('segments', [])
    total_segmentos = len(segments)
    
    ultimo_print = time.time() 
    print(f"Iniciando a tradução com proxy...")

    for i, seg in enumerate(segments):
        try:
            texto_original = seg['text']
            texto_traduzido = translator.translate(texto_original)
            
            legenda = srt.Subtitle(
                index=seg['id'] + 1,
                start=timedelta(seconds=seg['start']),
                end=timedelta(seconds=seg['end']),
                content=texto_traduzido
            )
            subtitles.append(legenda)
            
        except Exception as e:
            print(f"Erro no segmento {i}: {e}")
            continue
        
        tempo_atual = time.time()
        if tempo_atual - ultimo_print >= 2.0:
            porcentagem = int(((i + 1) / total_segmentos) * 100)
            print(f"Porcentagem de conclusão: {porcentagem}%")
            ultimo_print = tempo_atual

    return srt.compose(subtitles)

# --- EXECUÇÃO ---
try:
    # trocar o "caminho arquivo" pela lógica do sistema (receber o vídeo que o usuário fez upload e devolver, salvando numa pasta "translations", Ex: video_2_ptbr.srt)
    caminho_arquivo = '/home/estudante1/Documentos/GitHub/DeMoviefy/demoviefy-backend/app/services/Teste JSON.json'
    
    with open(caminho_arquivo, 'r', encoding='utf-8') as video:
        data = json.load(video)

    resultado_srt = converter_para_srt(data)

    with open("video_2_traduzido.srt", "w", encoding="utf-8") as translated_video:
        translated_video.write(resultado_srt)

    print("Porcentagem de conclusão: 100% - Sucesso!")
    print("Arquivo 'video_2_traduzido.srt' gerado.")

except FileNotFoundError:
    print(f"Erro: O arquivo não foi encontrado no caminho {caminho_arquivo}")
except Exception as e:
    print(f"Ocorreu um erro inesperado: {e}")