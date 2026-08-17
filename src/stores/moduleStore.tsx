import { useState } from "react";
import { ModuleDefinition, ModuleId } from "../types/modules";
import { WealthView } from "../modules/wealth/WealthView";
import { SettingsView } from "../modules/settings/SettingsView";
import { FutureModulePlaceholder } from "../modules/placeholders/FutureModulePlaceholder";

function PriceCheckModule() {
  return (
    <FutureModulePlaceholder
      name="Price Check"
      versionTarget="Planejado para V2"
      icon="🔍"
      description="Consulta rápida de preços e avaliação de itens no mercado oficial do Path of Exile."
    />
  );
}

function TradeModule() {
  return (
    <FutureModulePlaceholder
      name="Trade Manager"
      versionTarget="Planejado para V3"
      icon="🤝"
      description="Gerenciador de mensagens de trade, avisos e histórico de negociações."
    />
  );
}

function InventoryModule() {
  return (
    <FutureModulePlaceholder
      name="Inventory & Stash"
      versionTarget="Planejado para V4"
      icon="🎒"
      description="Visualização rápida de abas de baú, buscas e filtros avançados de itens."
    />
  );
}

function MapsModule() {
  return (
    <FutureModulePlaceholder
      name="Maps & Economy"
      versionTarget="Planejado para V5"
      icon="🗺️"
      description="Estatísticas de mapas, modificadores perigosos e cálculo de rendimento por run."
    />
  );
}

const INITIAL_MODULES: Record<ModuleId, ModuleDefinition> = {
  wealth: {
    id: "wealth",
    name: "Wealth",
    shortName: "Wealth",
    icon: "💰",
    description: "Cálculo e monitoramento em tempo real do patrimônio de itens e inventário.",
    enabled: true,
    isV1: true,
    order: 1,
    component: WealthView,
  },
  priceCheck: {
    id: "priceCheck",
    name: "Price Check",
    shortName: "Preços",
    icon: "🔍",
    description: "Consulta rápida de valor de itens no mercado oficial.",
    enabled: false,
    isV1: false,
    order: 2,
    component: PriceCheckModule,
  },
  trade: {
    id: "trade",
    name: "Trade",
    shortName: "Trade",
    icon: "🤝",
    description: "Notificações e gerenciamento de trocas oficiais.",
    enabled: false,
    isV1: false,
    order: 3,
    component: TradeModule,
  },
  inventory: {
    id: "inventory",
    name: "Inventory & Stash",
    shortName: "Inventário",
    icon: "🎒",
    description: "Visualização consolidada de abas de baú e inventário.",
    enabled: false,
    isV1: false,
    order: 4,
    component: InventoryModule,
  },
  maps: {
    id: "maps",
    name: "Maps & Economy",
    shortName: "Mapas",
    icon: "🗺️",
    description: "Informações sobre modificadores de mapa e economia.",
    enabled: false,
    isV1: false,
    order: 5,
    component: MapsModule,
  },
  settings: {
    id: "settings",
    name: "Configurações",
    shortName: "Config",
    icon: "⚙️",
    description: "Configurações gerais do overlay, atalhos e módulos.",
    enabled: true,
    isV1: true,
    order: 6,
    component: SettingsView,
  },
};

export function useModules() {
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>("wealth");
  const [modules, setModules] = useState<Record<ModuleId, ModuleDefinition>>(INITIAL_MODULES);

  const toggleModuleEnabled = (id: ModuleId, enabled?: boolean) => {
    setModules((prev) => {
      const nextState = enabled !== undefined ? enabled : !prev[id].enabled;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          enabled: nextState,
        },
      };
    });
  };

  return {
    activeModuleId,
    setActiveModuleId,
    modules,
    toggleModuleEnabled,
    activeModule: modules[activeModuleId] || modules.wealth,
  };
}
