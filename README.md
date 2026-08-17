# Poe Ledger ⚖️

Poe Ledger is a high-performance, modular desktop overlay for **Path of Exile 1**, built from scratch with **Tauri 2**, **Rust**, **React 19**, **TypeScript**, and **Vite**.

---

## 🧭 Architecture & Design Principles

```
React (Vite + TS)
  ↕  (Tauri IPC Bridge / Events)
Tauri 2 (Rust)
  ├── Window Management (Frameless, Transparent, Always-on-top, Draggable)
  ├── Global Hotkeys (Control+Shift+Space, Control+Shift+R, Control+Shift+M)
  ├── Path of Exile Official API (OAuth 2.0 PKCE, Characters, Inventory)
  ├── Economy Service & Price Provider (Dual-layer Cache, Rate Limiting)
  └── Local Storage & Persistent Settings
```

- **Official GGG APIs Only**: Adheres 100% to Grinding Gear Games developer policies (OAuth 2.0 PKCE, public endpoints, caching, rate limiting).
- **Zero Game Tampering**: No memory reading, no DLL injection, no unauthorized hooks.
- **Modular Core**: Engineered to support future modules seamlessly:
  - 💰 **Wealth** (V1 - Active)
  - 🔍 **Price Check** (V2 - Roadmap)
  - 🤝 **Trade** (V3 - Roadmap)
  - 🎒 **Inventory & Stash** (V4 - Roadmap)
  - 🗺️ **Maps & Economy** (V5 - Roadmap)
  - ⚙️ **Settings** (V1 - Active)
- **Overlay & Mini Player**:
  - Borderless draggable window (`data-tauri-drag-region`).
  - Native always-on-top toggle (📌).
  - Compact Mini Player mode (`⤡` / `⤢`) with live net worth summary.
  - Transparent frosted glass with configurable opacity and scaling.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ LTS)
- [Rust](https://www.rust-lang.org/) & Cargo (with `stable-x86_64-pc-windows-gnu` or `msvc`)
- C/C++ compiler toolchain (WinLibs GCC / MinGW-w64 or MSVC)

### Development

```bash
# Navigate to project directory
cd poe-ledger

# Install dependencies
npm install

# Start local Tauri desktop overlay
npm run tauri dev
```

### Production Build

```bash
# Build standalone Windows desktop application (.exe and .msi)
npm run tauri build
```

The compiled release executable will be available at `src-tauri/target/release/poe-ledger.exe`.

---

## ⌨️ Global Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Shift + Space` | Show / Hide Poe Ledger Overlay |
| `Ctrl + Shift + R` | Refresh Wealth & Prices |
| `Ctrl + Shift + M` | Toggle Compact Mini Player Mode |

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
