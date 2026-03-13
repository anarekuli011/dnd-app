# D&D Virtual Character Sheet

Desktop app for managing D&D character sheets with cloud sync and live multiplayer sessions.

Built with **Electron + React + TypeScript + Firebase**.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Firebase CLI](https://firebase.google.com/docs/cli) (`npm install -g firebase-tools`)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → Sign-in method → Email/Password and Google
3. Create a **Firestore Database** (start in test mode, then deploy rules)
4. Register a **Web App** and copy the config values
5. Copy `.env.example` to `.env` and paste your values:

```bash
cp .env.example .env
```

### 3. Deploy Firestore rules

```bash
firebase login
firebase use --add   # select your project
firebase deploy --only firestore:rules
```

### 4. Run in development

```bash
# Start the Vite dev server + Electron
npm run electron:dev
```

### 5. (Optional) Use Firebase Emulators

For offline development without touching your live Firebase project:

```bash
# In .env, set:
# VITE_USE_EMULATORS=true

# Then start emulators in a separate terminal:
firebase emulators:start

# And run the app:
npm run electron:dev
```

---

## Project Structure

```
dnd-character-sheet/
├── electron/               # Electron main process + preload
│   ├── main.ts
│   ├── preload.ts
│   └── tsconfig.json
├── src/
│   ├── config/
│   │   └── firebase.ts     # Firebase init + emulator config
│   ├── features/
│   │   ├── auth/            # Login, signup, auth context
│   │   ├── character-sheet/ # (Phase 2+)
│   │   ├── dashboard/       # Post-login landing page
│   │   ├── dice/            # (Phase 3)
│   │   ├── gm-tools/        # (Phase 4)
│   │   └── session/         # (Phase 2+)
│   ├── shared/
│   │   ├── types/dnd.ts     # All D&D TypeScript types
│   │   ├── components/      # Shared UI components
│   │   └── utils/           # Helper functions
│   ├── styles/global.css
│   ├── App.tsx              # Route definitions
│   └── main.tsx             # React entry point
├── firestore.rules          # Security rules
├── firebase.json            # Emulator + deploy config
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## Build for Distribution

```bash
npm run electron:build
```

Installers are output to the `release/` directory (NSIS for Windows, DMG for Mac, AppImage for Linux).

---

## Development Phases

| Phase | Focus                        | Status |
|-------|------------------------------|--------|
| 1     | Skeleton (Electron + Auth)   | ✅      |
| 2     | Live Sessions                | ✅      |
| 3     | Dice & Calculations          | ⬜      |
| 4     | GM Tools                     | ⬜      |
| 5     | Visual Polish                | ⬜      |
