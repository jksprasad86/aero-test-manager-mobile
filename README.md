# Aero Test Manager — Mobile App

React Native (Expo) Android companion app for the Aero Test Manager web platform.

## Features

| Module | View | Add | Edit |
|--------|------|-----|------|
| Dashboard | ✅ | — | — |
| Test Cases | ✅ (hierarchy browser) | ✅ | ✅ |
| Work Updates | ✅ | ✅ | ✅ |
| Settings / Admin | Web only | Web only | Web only |
| PDF / CSV Reports | Web only | — | — |

### Voice-to-Text
All text fields in Add/Edit forms have a microphone button for voice input.
Tap the mic icon → speak → text is appended automatically.

---

## Setup

### 1. Prerequisites
- Node.js 18+
- Android device or emulator
- Expo CLI: `npm install -g expo-cli`
- EAS CLI (for builds): `npm install -g eas-cli`

### 2. Install dependencies
```bash
cd mobile
npm install
```

### 3. API URL
Already configured in `src/config.js` to point to the production server:

```js
export const API_BASE_URL = 'https://qa.aerosimple.app/api';
```

### 4. Run on Android (Development)

**Option A — Expo Go (quick test, voice-to-text disabled)**
```bash
npm start
# Scan the QR code with the Expo Go app on your Android phone
```

**Option B — Custom Dev Client (full features including voice)**
```bash
# First time only: build the dev client
eas build --platform android --profile development
# Then start with dev client
npx expo start --dev-client
```

### 5. Build APK for distribution
```bash
eas build --platform android --profile preview
```
This produces an `.apk` you can install on any Android device.

---

## Project Structure

```
mobile/
├── App.jsx                          # Root component
├── index.js                         # Entry point
├── app.json                         # Expo config (permissions, app name)
├── package.json
├── babel.config.js
└── src/
    ├── config.js                    # API base URL + theme colors
    ├── api/
    │   └── client.js                # Axios instance + all API calls
    ├── context/
    │   └── AuthContext.jsx          # Auth state + JWT management
    ├── navigation/
    │   └── AppNavigator.jsx         # Stack + bottom tab navigation
    ├── screens/
    │   ├── auth/
    │   │   └── LoginScreen.jsx
    │   ├── dashboard/
    │   │   └── DashboardScreen.jsx  # Metrics, result distribution, team stats
    │   ├── testcases/
    │   │   ├── TestCasesScreen.jsx  # Module → Submodule → Scenario → TC browser
    │   │   └── TestCaseFormScreen.jsx  # Add / Edit test case with steps
    │   └── workupdates/
    │       ├── WorkUpdatesScreen.jsx   # List all entries
    │       └── WorkEntryFormScreen.jsx # Add / Edit entry with voice input
    ├── components/
    │   └── VoiceInput.jsx           # Text input with microphone button
    └── utils/
        └── storage.js               # AsyncStorage helpers (token + user)
```

---

## EAS Build Profiles (eas.json)

Create `mobile/eas.json` if you want to use EAS Build:

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "android": { "buildType": "aab" }
    }
  }
}
```

---

## Permissions Used

| Permission | Purpose |
|------------|---------|
| `RECORD_AUDIO` | Voice-to-text input in forms |
| `INTERNET` | API calls to the backend server |
