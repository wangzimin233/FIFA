# FIFA Frontend Scaffold

React 19 + TypeScript + Vite starter with:

- Tailwind CSS v4
- HeroUI v3
- React Router
- TanStack Query + Axios
- Zustand
- Reown AppKit + Wagmi + Viem + Ethers
- Motion
- i18next + react-i18next + browser language detector + HTTP backend
- ECharts

## Start

```bash
pnpm install
pnpm dev
```

## Environment

Create a local `.env` from `.env.example` and set:

```bash
VITE_REOWN_PROJECT_ID=your_reown_project_id
```

Without that key, the app still runs, but wallet connection is intentionally left disabled in the UI.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm preview
```
