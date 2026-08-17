# Poe Ledger

Poe Ledger is a modern, modular desktop overlay for **Path of Exile 1**, built from scratch with **Tauri**, **Rust**, **React**, **TypeScript**, and **Vite**.

## Architecture & Principles

- **Official GGG APIs Only**: Built strictly adhering to Grinding Gear Games developer policies (OAuth 2.0 PKCE, public/authenticated endpoints, caching, rate limiting).
- **Zero Game Tampering**: No memory reading, no DLL injection, no unauthorized hooks.
- **Modular Core**: Engineered to support multiple independent overlay modules (Wealth, Price Check, Trade, Inventory, Maps).
- **High-Performance Overlay**: Native window management with transparency, always-on-top, persistent positioning, and minimal resource usage.

## Tech Stack

- **Desktop Shell**: Tauri 2 (Rust)
- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Modern CSS Design System (Tailored Dark Theme)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Rust](https://www.rust-lang.org/) & Cargo (with `stable-x86_64-pc-windows-gnu` or `msvc`)
- C/C++ compiler toolchain (MinGW-w64 / WinLibs or MSVC)

### Development

```bash
# Install frontend dependencies
npm install

# Start Tauri dev overlay
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

## License

MIT License. See [LICENSE](LICENSE) for details.
