import { ModuleDefinition, ModuleId } from "../../types/modules";

interface ModuleNavProps {
  modules: Record<ModuleId, ModuleDefinition>;
  activeModuleId: ModuleId;
  onSelectModule: (id: ModuleId) => void;
}

export function ModuleNav({
  modules,
  activeModuleId,
  onSelectModule,
}: ModuleNavProps) {
  const moduleList = Object.values(modules).sort((a, b) => a.order - b.order);

  return (
    <nav className="module-nav" aria-label="Módulos do Poe Ledger">
      <div className="nav-group main-modules">
        {moduleList
          .filter((m) => m.id !== "settings")
          .map((m) => {
            const isActive = m.id === activeModuleId;
            const isAvailable = m.isV1;

            return (
              <button
                key={m.id}
                type="button"
                className={`nav-tab ${isActive ? "active" : ""} ${!isAvailable ? "disabled-module" : ""}`}
                onClick={() => onSelectModule(m.id)}
                title={`${m.name} ${!isAvailable ? "(Roadmap)" : ""}`}
                aria-current={isActive ? "page" : undefined}
              >
                <span className="nav-icon">{m.icon}</span>
                <span className="nav-title">{m.shortName}</span>
                {!isAvailable && <span className="badge-soon">V{m.order}</span>}
              </button>
            );
          })}
      </div>

      <div className="nav-group utility-modules">
        {modules.settings && (
          <button
            type="button"
            className={`nav-tab settings-tab ${activeModuleId === "settings" ? "active" : ""}`}
            onClick={() => onSelectModule("settings")}
            title="Configurações"
            aria-label="Configurações do aplicativo"
          >
            <span className="nav-icon">{modules.settings.icon}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

export default ModuleNav;
