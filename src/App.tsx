export function App() {
  return (
    <main className="app-container">
      <header className="app-header">
        <div className="brand-title">
          <span>⚖️</span>
          <span>Poe Ledger</span>
        </div>
        <div className="status-badge">
          <span className="status-dot"></span>
          <span>Core v0.1.0</span>
        </div>
      </header>

      <section className="app-content">
        <div className="card">
          <h2 className="card-title">Poe Ledger Core</h2>
          <p className="card-subtitle">
            Path of Exile 1 Modular Overlay Framework initialized successfully.
          </p>
        </div>

        <div className="card">
          <h3 className="card-title">Módulos Ativos</h3>
          <p className="card-subtitle">
            • Wealth (V1 - Em preparação para a próxima fase)
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
