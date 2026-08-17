import { useState } from "react";
import { PoeItem } from "../../types/item";
import { GggRawItem, parsePoeItem } from "../../services/poe/poeItemParser";

interface CharacterLoadoutProps {
  items: PoeItem[];
}

type SlotId = "Weapon" | "Offhand" | "Helmet" | "BodyArmour" | "Gloves" | "Boots" | "Amulet" | "Ring" | "Ring2" | "Belt";

const SLOTS: Array<{ id: SlotId; label: string; className: string }> = [
  { id: "Weapon", label: "Arma", className: "loadout-weapon" },
  { id: "Offhand", label: "Mão secundária", className: "loadout-offhand" },
  { id: "Helmet", label: "Elmo", className: "loadout-helmet" },
  { id: "BodyArmour", label: "Armadura", className: "loadout-body" },
  { id: "Gloves", label: "Luvas", className: "loadout-gloves" },
  { id: "Boots", label: "Botas", className: "loadout-boots" },
  { id: "Amulet", label: "Amuleto", className: "loadout-amulet" },
  { id: "Ring", label: "Anel esquerdo", className: "loadout-ring-left" },
  { id: "Ring2", label: "Anel direito", className: "loadout-ring-right" },
  { id: "Belt", label: "Cinto", className: "loadout-belt" },
];

function inventoryId(item: PoeItem): string | undefined {
  const raw = item.rawData as { inventoryId?: unknown } | undefined;
  return typeof raw?.inventoryId === "string" ? raw.inventoryId : undefined;
}

function loadoutSlot(item: PoeItem): string | undefined {
  const rawSlot = inventoryId(item);
  // GGG calls this slot "Helm" in the character-items response, while the
  // layout itself uses the more legible "Helmet" name.
  return rawSlot === "Helm" ? "Helmet" : rawSlot;
}

type RawItemDetails = {
  properties?: Array<{ name?: unknown; values?: Array<[unknown, unknown]> }>;
  requirements?: Array<{ name?: unknown; values?: Array<[unknown, unknown]> }>;
  implicitMods?: unknown;
  explicitMods?: unknown;
  craftedMods?: unknown;
  enchantMods?: unknown;
  utilityMods?: unknown;
  fracturedMods?: unknown;
  veiledMods?: unknown;
  scourgeMods?: unknown;
  crucibleMods?: unknown;
  runeMods?: unknown;
  descrText?: unknown;
  flavourText?: unknown;
  socketedItems?: unknown;
  extended?: { mods?: Record<string, unknown> };
};

function cleanText(value: string): string {
  return value.replace(/<<.*?>>/g, "").trim();
}

function stringLines(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((line): line is string => typeof line === "string" && line.trim().length > 0).map(cleanText).filter(Boolean) : [];
}

function extendedModLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((modifier) => {
    if (typeof modifier === "string") return [cleanText(modifier)];
    if (modifier && typeof modifier === "object") {
      const details = modifier as { name?: unknown; text?: unknown };
      const text = typeof details.text === "string" ? details.text : details.name;
      return typeof text === "string" ? [cleanText(text)] : [];
    }
    return [];
  });
}

function detailLines(properties: RawItemDetails["properties"]): string[] {
  return (properties ?? []).flatMap((property) => {
    if (typeof property.name !== "string") return [];
    const values = (property.values ?? []).map(([value]) => String(value)).filter(Boolean);
    return [`${cleanText(property.name)}${values.length ? `: ${values.map(cleanText).join(", ")}` : ""}`];
  });
}

function requiredLevel(requirements: RawItemDetails["requirements"]): string | undefined {
  const level = (requirements ?? []).find((requirement) => typeof requirement.name === "string" && requirement.name.toLowerCase() === "level");
  const value = level?.values?.[0]?.[0];
  return value === undefined ? undefined : String(value);
}

function uniqueLines(lines: string[]): string[] {
  return [...new Set(lines.map((line) => line.trim()).filter(Boolean))];
}

function socketedGems(item: PoeItem): PoeItem[] {
  const raw = item.rawData as RawItemDetails | undefined;
  if (!Array.isArray(raw?.socketedItems)) return [];
  return raw.socketedItems
    .filter((gem): gem is GggRawItem => Boolean(gem) && typeof gem === "object")
    .map((gem, index) => parsePoeItem(gem, `${item.id}-gem-${index}`));
}

function ItemTooltip({ item }: { item: PoeItem }) {
  const raw = (item.rawData ?? {}) as RawItemDetails;
  const properties = detailLines(raw.properties);
  const requirements = detailLines(raw.requirements);
  const level = requiredLevel(raw.requirements);
  const implicitMods = uniqueLines([
    ...stringLines(raw.implicitMods),
    ...stringLines(raw.utilityMods),
    ...extendedModLines(raw.extended?.mods?.implicit),
    ...extendedModLines(raw.extended?.mods?.utility),
  ]);
  const explicitMods = uniqueLines([
    ...stringLines(raw.explicitMods),
    ...stringLines(raw.craftedMods),
    ...stringLines(raw.enchantMods),
    ...stringLines(raw.fracturedMods),
    ...stringLines(raw.veiledMods),
    ...stringLines(raw.scourgeMods),
    ...stringLines(raw.crucibleMods),
    ...stringLines(raw.runeMods),
    ...extendedModLines(raw.extended?.mods?.explicit),
    ...extendedModLines(raw.extended?.mods?.crafted),
    ...extendedModLines(raw.extended?.mods?.enchant),
    ...extendedModLines(raw.extended?.mods?.fractured),
    ...extendedModLines(raw.extended?.mods?.veiled),
  ]);
  const description = typeof raw.descrText === "string" && raw.descrText.trim() ? raw.descrText.trim() : undefined;

  return (
    <aside className="loadout-tooltip" role="tooltip">
      <strong className={`loadout-tooltip-title rarity-${item.rarity}`}>{item.name || item.typeLine}</strong>
      {item.name && item.typeLine && <span className="loadout-tooltip-base">{item.typeLine}</span>}
      {(level || item.itemLevel || item.corrupted) && <span className="loadout-tooltip-meta">{[level ? `Nível ${level}` : "", item.itemLevel ? `Item nível ${item.itemLevel}` : "", item.corrupted ? "Corrompido" : ""].filter(Boolean).join(" · ")}</span>}
      {properties.length > 0 && <div className="loadout-tooltip-section">{properties.map((line) => <span className="loadout-tooltip-property" key={line}>{line}</span>)}</div>}
      {requirements.length > 0 && (
        <div className="loadout-tooltip-section loadout-tooltip-requirements">
          <span className="loadout-tooltip-label">Requisitos</span>
          {requirements.map((line) => <span key={line}>{line}</span>)}
        </div>
      )}
      {implicitMods.length > 0 && <div className="loadout-tooltip-section">{implicitMods.map((line) => <span className="loadout-tooltip-implicit" key={line}>{line}</span>)}</div>}
      {explicitMods.length > 0 && <div className="loadout-tooltip-section">{explicitMods.map((line) => <span className="loadout-tooltip-modifier" key={line}>{line}</span>)}</div>}
      {description && <span className="loadout-tooltip-description">{description}</span>}
      {stringLines(raw.flavourText).map((line) => <em key={line}>{line}</em>)}
    </aside>
  );
}

function Slot({ label, item, className }: { label: string; item?: PoeItem; className: string }) {
  const gems = item ? socketedGems(item) : [];
  const [hoveredGemId, setHoveredGemId] = useState<string | null>(null);
  return (
    <div className={`loadout-slot ${className}`} title={item ? `${item.name || item.typeLine}${item.typeLine ? ` — ${item.typeLine}` : ""}` : `${label}: vazio`}>
      {item?.icon ? <img src={item.icon} alt={item.name || item.typeLine} /> : <span>{label}</span>}
      {gems.length > 0 && (
        <div className="loadout-gems" aria-label={`Gemas em ${label}`}>
          {gems.slice(0, 6).map((gem) => (
            <div
              className="loadout-gem"
              key={gem.id}
              title={gem.name || gem.typeLine}
              onMouseEnter={() => setHoveredGemId(gem.id)}
              onMouseLeave={() => setHoveredGemId((current) => current === gem.id ? null : current)}
            >
              {gem.icon && <img src={gem.icon} alt={gem.name || gem.typeLine} />}
              <ItemTooltip item={gem} />
            </div>
          ))}
        </div>
      )}
      {item && !hoveredGemId && <ItemTooltip item={item} />}
    </div>
  );
}

export function CharacterLoadout({ items }: CharacterLoadoutProps) {
  const equipped = new Map<string, PoeItem>();
  const flasks: PoeItem[] = [];

  for (const item of items) {
    const slot = loadoutSlot(item);
    if (slot === "Flask") flasks.push(item);
    else if (slot && !equipped.has(slot)) equipped.set(slot, item);
  }

  return (
    <section className="character-loadout">
      <div className="loadout-heading">
        <strong>Loadout atual</strong>
        <span>{items.length ? "Equipamentos e frascos carregados" : "Nenhum item equipado foi carregado"}</span>
      </div>
      <div className="loadout-board">
        {SLOTS.map((slot) => <Slot key={slot.id} label={slot.label} className={slot.className} item={equipped.get(slot.id)} />)}
        <div className="loadout-flasks">
          {Array.from({ length: 5 }, (_, index) => <Slot key={index} label={`Frasco ${index + 1}`} className="loadout-flask" item={flasks[index]} />)}
        </div>
      </div>
    </section>
  );
}
