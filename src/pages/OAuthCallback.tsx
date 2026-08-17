import { useEffect, useState } from "react";
import { poeAuthService } from "../services/poe/poeAuthService";
import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "../services/http/isTauri";

export function OAuthCallback() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Processando autorização...");

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const params = new URL(window.location.href).searchParams;
        const code = params.get("code");

        if (!code) {
          setStatus("error");
          setMessage("Código de autorização não encontrado. Tente novamente.");
          return;
        }

        const clientId = "poe-ledger";
        const redirectUri = "http://localhost:5173/?oauth_callback=true";

        const token = await poeAuthService.exchangeCodeForToken(
          code,
          clientId,
          redirectUri
        );

        setStatus("success");
        setMessage(`Autenticado com sucesso! Conta: ${token.username || "Path of Exile"}`);

        setTimeout(async () => {
          try {
            if (isTauri()) {
              await invoke("close_oauth_callback_window");
            } else {
              window.close();
            }
          } catch {
            window.close();
          }
        }, 2000);
      } catch (error) {
        console.error("OAuth error:", error);
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "Erro ao processar autorização."
        );
      }
    };

    handleCallback();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#0a0e27",
        color: "#e8e8e8",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          padding: "40px",
          borderRadius: "8px",
          backgroundColor: "rgba(20, 30, 60, 0.8)",
          border: "1px solid rgba(100, 150, 255, 0.3)",
          maxWidth: "500px",
        }}
      >
        {status === "loading" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>⏳</div>
            <h2>Processando login</h2>
            <p style={{ opacity: 0.7 }}>Aguarde um momento...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>✅</div>
            <h2>Sucesso!</h2>
            <p>{message}</p>
            <p style={{ fontSize: "12px", opacity: 0.5, marginTop: "20px" }}>
              Fechando em breve...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>❌</div>
            <h2>Erro na autenticação</h2>
            <p style={{ color: "#ff6b6b" }}>{message}</p>
            <button
              onClick={() => window.close()}
              style={{
                marginTop: "20px",
                padding: "10px 20px",
                backgroundColor: "rgba(100, 150, 255, 0.2)",
                border: "1px solid rgba(100, 150, 255, 0.5)",
                color: "#e8e8e8",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Fechar
            </button>
          </>
        )}
      </div>
    </div>
  );
}
