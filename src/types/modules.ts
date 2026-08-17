import { ComponentType } from "react";

export type ModuleId = "wealth" | "priceCheck" | "trade" | "inventory" | "maps" | "settings";

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  shortName: string;
  icon: string;
  description: string;
  enabled: boolean;
  isV1: boolean;
  order: number;
  component: ComponentType<any>;
}

export interface ModuleRegistryState {
  activeModuleId: ModuleId;
  modules: Record<ModuleId, ModuleDefinition>;
  setActiveModule: (id: ModuleId) => void;
  toggleModuleEnabled: (id: ModuleId, enabled?: boolean) => void;
}
