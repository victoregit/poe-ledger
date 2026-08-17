interface FutureModulePlaceholderProps {
  name: string;
  versionTarget: string;
  icon: string;
  description: string;
}

export function FutureModulePlaceholder({
  name,
  versionTarget,
  icon,
  description,
}: FutureModulePlaceholderProps) {
  return (
    <div className="module-view placeholder-view">
      <div className="empty-state">
        <span className="empty-icon">{icon}</span>
        <h3 className="empty-title">{name}</h3>
        <p className="empty-badge">{versionTarget}</p>
        <p className="empty-desc">{description}</p>
        <div className="placeholder-note">
          <span>Este módulo está planejado no roadmap e será habilitado em versões futuras.</span>
        </div>
      </div>
    </div>
  );
}

export default FutureModulePlaceholder;
