import { useEffect } from "react";
import { WindowHeader } from "./components/core/WindowHeader";
import { ModuleNav } from "./components/core/ModuleNav";
import { useModules } from "./stores/moduleStore";
import { useSettings } from "./stores/settingsStore";
import { hotkeyService } from "./services/hotkeys/hotkeyService";

export function App() {
  const { activeModuleId, setActiveModuleId, modules, activeModule } = useModules();
  const [settings, setSettings] = useSettings();

  useEffect(() => {
    // Setup global and local hotkeys
    hotkeyService.setupGlobalHotkeys(settings.hotkeys, {
      onToggleOverlay: () => {
        console.log("Overlay toggled via shortcut");
      },
      onRefreshWealth: () => {
        console.log("Refresh Wealth triggered via shortcut");
      },
    });

    return () => {
      hotkeyService.cleanup();
    };
  }, [settings.hotkeys]);

  const ActiveComponent = activeModule.component;

  const handleTogglePin = () => {
    setSettings((prev) => ({
      ...prev,
      overlay: { ...prev.overlay, alwaysOnTop: !prev.overlay.alwaysOnTop },
    }));
  };

  return (
    <main className="overlay-wrapper">
      <WindowHeader
        title="Poe Ledger"
        isAlwaysOnTop={settings.overlay.alwaysOnTop}
        onToggleAlwaysOnTop={handleTogglePin}
      />

      <ModuleNav
        modules={modules}
        activeModuleId={activeModuleId}
        onSelectModule={setActiveModuleId}
      />

      <section className="overlay-content">
        <ActiveComponent />
      </section>
    </main>
  );
}

export default App;
