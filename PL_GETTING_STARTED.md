
## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **npm** 9 or later
- **Expo Go** app installed on your Android / iOS device (for mobile), or an Android emulator / iOS Simulator

---

### Installation

Install packages for both web and mobile before running either app.

```bash
# 1. Install web dependencies (from project root)
cd product-listing
npm install

# 2. Install mobile dependencies
cd mobile
npm install
```

Or install them independently:

```bash
# Web only
cd product-listing && npm install

# Mobile only
cd product-listing/mobile && npm install
```

---

### Web (Next.js)

```bash
# 1. Navigate to the project root
cd product-listing

# 2. Install dependencies (if not done above)
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/products`.

#### Other web commands

```bash
# Type-check without emitting files
npx tsc --noEmit

# Run web Jest stress tests (38 tests)
npm test
# or with verbose output
npm run test:verbose
# or in watch mode
npm run test:watch

# Production build
npm run build

# Start the production server (after build)
npm start
```

---

### Mobile (React Native / Expo)

The mobile app is located in the `mobile/` subdirectory and connects to the Next.js API at `http://localhost:3000`.

> **Important:** start the web dev server first (`npm run dev` in the root) so the mobile app has a running API to talk to.

```bash
# 1. Navigate to the mobile directory
cd product-listing/mobile

# 2. Install dependencies
npm install

# 3. Start the Expo development server
npx expo start
```

Expo will print a QR code in the terminal.

| Platform | How to open |
|---|---|
| **Physical device** | Scan the QR code with the **Expo Go** app (Android) or the Camera app (iOS) |
| **Android emulator** | Press `a` in the Expo terminal after the emulator is running |
| **iOS Simulator** | Press `i` in the Expo terminal (macOS only, requires Xcode) |

#### Other mobile commands

```bash
# Run mobile Jest tests (61 tests)
npx jest --passWithNoTests

# Run with verbose output
npx jest --passWithNoTests --verbose

# Type-check mobile TypeScript
npx tsc --noEmit
```

---

### Running Both Together

Open two terminals side by side:

```bash
# Terminal 1 — Web API + UI
cd product-listing
npm run dev

# Terminal 2 — Mobile
cd product-listing/mobile
npx expo start
```

The mobile app reads `API_BASE_URL` from `mobile/src/constants/config.ts` (defaults to `http://localhost:3000`). If you are testing on a physical device over Wi-Fi, update that constant to your machine's local IP address (e.g. `http://192.168.1.x:3000`).

---

### Running All Tests

```bash
# Web tests (from project root)
cd product-listing
npm test

# Mobile tests (from mobile directory)
cd product-listing/mobile
npx jest --passWithNoTests --verbose
```

Expected results:

| Suite | Tests |
|---|---|
| Web (Next.js domain + resilience) | **38 / 38** passing |
| Mobile (React Native hooks + screens) | **61 / 61** passing |

---