import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

type Video = {
  id: number;
  filename: string;
  status: string;
  created_at: string | null;
};

type Stats = {
  total: number;
  processing: number;
  processed: number;
};

function nowLabel() {
  return new Date().toLocaleTimeString();
}

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [actionLogs, setActionLogs] = useState<string[]>([]);

  const appendLog = (text: string) => {
    setActionLogs((prev) => [`[${nowLabel()}] ${text}`, ...prev].slice(0, 30));
  };

  const fetchVideos = async () => {
    setLoadingVideos(true);
    try {
      const response = await api.get<Video[]>("/videos");
      setVideos(response.data);
      appendLog(`Lista atualizada (${response.data.length} videos).`);
    } catch (error) {
      console.error(error);
      appendLog("Erro ao buscar lista de videos.");
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const stats = useMemo<Stats>(() => {
    const total = videos.length;
    const processing = videos.filter(
      (video) => video.status.toUpperCase() === "PROCESSANDO"
    ).length;
    const processed = videos.filter((video) => video.status.toUpperCase() === "PROCESSADO").length;

    return { total, processing, processed };
  }, [videos]);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Selecione um arquivo primeiro.");
      appendLog("Tentativa de upload sem selecionar arquivo.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/videos", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      setMessage("Upload realizado com sucesso!");
      appendLog(`Upload concluido: ${file.name}.`);
      console.log(response.data);
      setFile(null);
      await fetchVideos();
    } catch (error) {
      console.error(error);
      setMessage("Erro ao enviar arquivo.");
      appendLog(`Falha no upload: ${file.name}.`);
    }
  };

  return (
    <div className="container">
      <h1>Upload de Video</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <span>Total</span>
          <strong>{stats.total}</strong>
        </div>
        <div className="stat-card">
          <span>Processando</span>
          <strong>{stats.processing}</strong>
        </div>
        <div className="stat-card">
          <span>Processados</span>
          <strong>{stats.processed}</strong>
        </div>
      </div>

      <input
        type="file"
        accept="video/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleUpload}>Enviar</button>

      <p>{message}</p>

      <section className="panel">
        <h2>Videos</h2>
        {loadingVideos && <p>Atualizando...</p>}
        {!loadingVideos && videos.length === 0 && <p>Nenhum video enviado.</p>}
        {!loadingVideos && videos.length > 0 && (
          <ul>
            {videos.map((video) => (
              <li key={video.id}>
                #{video.id} - {video.filename} ({video.status})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Log de Acoes</h2>
        {actionLogs.length === 0 && <p>Sem logs ainda.</p>}
        {actionLogs.length > 0 && (
          <ul>
            {actionLogs.map((log, index) => (
              <li key={`${log}-${index}`}>{log}</li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
