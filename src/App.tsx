import { useState, useEffect } from "react";
import { WindowHeader } from "./components/core/WindowHeader";
import { ModuleNav } from "./components/core/ModuleNav";
import { useModules } from "./stores/moduleStore";
import { useSettings } from "./stores/settingsStore";
import { hotkeyService } from "./services/hotkeys/hotkeyService";
import { WealthView } from "./modules/wealth/WealthView";

export function App() {
  const { activeModuleId, setActiveModuleId, modules, activeModule } = useModules();
  const [settings, setSettings] = useSettings();
  const [isCompact, setIsCompact] = useState(false);
  const [netWorthSummary, setNetWorthSummary] = useState("386.6 div");

  const toggleCompact = () => {
    setIsCompact((prev) => !prev);
  };

  useEffect(() => {
    // Setup global and local hotkeys
    hotkeyService.setupGlobalHotkeys(settings.hotkeys, {
      onToggleOverlay: () => {
        console.log("Overlay toggled via shortcut");
      },
      onRefreshWealth: () => {
        console.log("Refresh Wealth triggered via shortcut");
      },
      onToggleCompact: () => {
        toggleCompact();
      },
    });

    return () => {
      hotkeyService.cleanup();
    };
  }, [settings.hotkeys]);

  const handleTogglePin = () => {
    setSettings((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, alwaysOnTop: !prev.overlay.alwaysOnTop },
    }));
  };

  const ActiveComponent = activeModule.component;

  return (
    <main className={`overlay-wrapper ${isCompact ? "compact-overlay" : ""}`}>
      <WindowHeader
        title="Poe Ledger"
        isAlwaysOnTop={settings.overlay.alwaysOnTop}
        isCompact={isCompact}
        compactSummary={`💰 ${netWorthSummary}`}
        onToggleAlwaysOnTop={handleTogglePin}
        onToggleCompact={toggleCompact}
      />

      {!isCompact && (
        <>
          <ModuleNav
            modules={modules}
            activeModuleId={activeModuleId}
            onSelectModule={setActiveModuleId}
          />

          <section className="overlay-content">
            {activeModuleId === "wealth" ? (
              <WealthView onNetWorthChange={setNetWorthSummary} />
            ) : (
              <ActiveComponent />
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default App;
