import { WindowHeader } from "./components/core/WindowHeader";

export function App() {
  return (
    <main className="overlay-wrapper">
      <WindowHeader title="Poe Ledger" isAlwaysOnTop={true} />

      <section className="overlay-content">
        <div className="card">
          <h2 className="card-title">Poe Ledger Overlay</h2>
          <p className="card-subtitle">
            Janela de overlay sem bordas, transparente e fixável no topo configurada com sucesso.
          </p>
          <div className="status-badge">
            <span className="status-dot"></span>
            <span>Overlay Ativo</span>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Controles de Janela</h3>
          <p className="card-subtitle">
            • <strong>Arrastar</strong>: Clique e arraste pelo cabeçalho.<br />
            • <strong>📌 Pin</strong>: Fixar / desfixar "Always on Top".<br />
            • <strong>− / ×</strong>: Minimizar e fechar o aplicativo.
          </p>
        </div>
      </section>
    </main>
  );
}

export default App;
