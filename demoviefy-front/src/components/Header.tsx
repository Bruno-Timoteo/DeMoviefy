type HeaderProps = {
  themeLabel: string;
  onToggleTheme: () => void;
};

export default function Header({ themeLabel, onToggleTheme }: HeaderProps) {
  return (
    <header className="app-header">
      <div>
        <span className="eyebrow">DeMoviefy</span>
        <h1>Painel de analise de videos</h1>
      </div>
      <div className="header-actions">
        <p>
          Upload, acompanhamento do processamento e visualizacao dos arquivos gerados em um so lugar.
        </p>
        <button type="button" className="ghost-button theme-toggle" onClick={onToggleTheme}>
          {themeLabel}
        </button>
      </div>
    </header>
  );
}
