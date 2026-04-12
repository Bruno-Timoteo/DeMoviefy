import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { VideoService } from "../../services/videoService";
import "./Home.css";

interface Stats {
  total: number;
  processing: number;
  processed: number;
  errors: number;
}

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    processing: 0,
    processed: 0,
    errors: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const videoStats = await VideoService.getVideoStats();
        setStats(videoStats);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="home-page">
      {/* Hero Section */}
      <section className="home-hero">
        <span className="eyebrow">DeMoviefy</span>
        <h1>Analise vídeos com IA. Em um só lugar.</h1>
        <p>
          Upload, processamento, análise e revisão. Tudo integrado em uma plataforma
          intuitiva que trabalha para você, não contra você.
        </p>

        <div className="home-actions">
          <Link className="primary-button" to="/upload">
            Começar agora
          </Link>
          <button type="button" className="ghost-button" disabled>
            Ver demonstração
          </button>
        </div>
        
        <p className="home-hero-footnote">Nenhum cartão de crédito necessário. Cancele quando quiser.</p>
      </section>

      {/* Stats Section */}
      <section className="home-stats">
        <div className="stat-item">
          <strong>{loading ? "-" : stats.total}</strong>
          <p>Vídeos totais</p>
        </div>
        <div className="stat-item">
          <strong>{loading ? "-" : stats.processing}</strong>
          <p>Em processamento</p>
        </div>
        <div className="stat-item">
          <strong>{loading ? "-" : stats.processed}</strong>
          <p>Processados</p>
        </div>
        <div className="stat-item">
          <strong>{loading ? "-" : stats.errors}</strong>
          <p>Erros</p>
        </div>
      </section>

      {/* Feature: Upload */}
      <section className="home-feature home-feature--alt">
        <div className="home-feature-content">
          <span className="eyebrow">Upload & Configuração</span>
          <h2>Envie vídeos e deixe a IA trabalhar</h2>
          <p>
            Selecione seus arquivos, escolha a tarefa desejada (detecção de objetos, 
            segmentação ou transcrição) e configure os parâmetros em segundos. 
            Sem complicações, sem espera.
          </p>
          <div className="home-feature-actions">
            <Link to="/upload" className="home-secondary-button">
              Experimentar upload
            </Link>
          </div>
        </div>
        <div className="home-feature-placeholder">
          <div className="placeholder-box">
            <span>Área de upload</span>
            <p>Arraste arquivos ou clique para selecionar</p>
          </div>
        </div>
      </section>

      {/* Feature: Processing */}
      <section className="home-feature">
        <div className="home-feature-placeholder">
          <div className="placeholder-box">
            <span>Processamento em tempo real</span>
            <p>Acompanhe o progresso de cada vídeo</p>
          </div>
        </div>
        <div className="home-feature-content">
          <span className="eyebrow">Acompanhamento</span>
          <h2>Monitore tudo em tempo real</h2>
          <p>
            Barra de progresso visual, estimativas de tempo, mensagens detalhadas. 
            Você sempre sabe exatamente o que está acontecendo com seus vídeos.
          </p>
          <div className="home-feature-actions">
            <Link to="/upload" className="home-secondary-button">
              Ver dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Feature: Results */}
      <section className="home-feature home-feature--alt">
        <div className="home-feature-content">
          <span className="eyebrow">Análise & Exportação</span>
          <h2>Extraia insights em segundos</h2>
          <p>
            Objetos detectados, confiança de cada detection, frames processados. 
            Exporte JSON, anotações visuais ou revisar diretamente no painel.
          </p>
          <div className="home-feature-actions">
            <Link to="/upload" className="home-secondary-button">
              Explorar resultados
            </Link>
          </div>
        </div>
        <div className="home-feature-placeholder">
          <div className="placeholder-box">
            <span>Visualização de análise</span>
            <p>Dados estruturados e exportáveis</p>
          </div>
        </div>
      </section>

      {/* Use Cases Grid */}
      <section className="home-capabilities">
        <span className="eyebrow">O que você pode fazer</span>
        <h2>Casos de uso</h2>
        
        <div className="home-capabilities-grid">
          <div className="capability-card">
            <div className="capability-icon">🎬</div>
            <h3>Detecção de objetos</h3>
            <p>Identifique e localize objetos em cada frame de forma automática.</p>
          </div>
          <div className="capability-card">
            <div className="capability-icon">🎭</div>
            <h3>Segmentação de instâncias</h3>
            <p>Separe elementos visuais distintos para análise detalhada.</p>
          </div>
          <div className="capability-card">
            <div className="capability-icon">🎯</div>
            <h3>Pose estimation</h3>
            <p>Reconheça e analise silhuetas e movimentos corporais.</p>
          </div>
          <div className="capability-card">
            <div className="capability-icon">🎤</div>
            <h3>Transcrição de áudio</h3>
            <p>Converta falas em texto com alta precisão e sem necessidade de edição manual.</p>
          </div>
          <div className="capability-card">
            <div className="capability-icon">📊</div>
            <h3>Relatórios estruturados</h3>
            <p>Resuma os resultados em formatos prontos para análise e compartilhamento.</p>
          </div>
          <div className="capability-card">
            <div className="capability-icon">⚡</div>
            <h3>Processamento em lote</h3>
            <p>Envie múltiplos vídeos e deixe o sistema processar enquanto você trabalha.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="home-cta-section">
        <h2>Pronto para começar?</h2>
        <p>Experimente grátis. Sem cartão de crédito. Comece em segundos.</p>
        <Link className="primary-button" to="/upload">
          Ir para dashboard
        </Link>
      </section>
    </section>
  );
}


