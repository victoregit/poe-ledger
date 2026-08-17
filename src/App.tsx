import { WindowHeader } from "./components/core/WindowHeader";
import { ModuleNav } from "./components/core/ModuleNav";
import { useModules } from "./stores/moduleStore";
import { useSettings } from "./stores/settingsStore";

export function App() {
  const { activeModuleId, setActiveModuleId, modules, activeModule } = useModules();
  const [settings, setSettings] = useSettings();

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
