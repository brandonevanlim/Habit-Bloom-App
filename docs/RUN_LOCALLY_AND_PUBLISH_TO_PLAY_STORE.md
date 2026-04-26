# 🚀 Run Sprout on your PC + Publish to Google Play Store

This guide walks you through everything from cloning the project to uploading
the final `.aab` to the Google Play Console.

---

## Part 1 — Run the web app on your PC (5 min)

### 1. Install the basics
- **Node.js 20+** → https://nodejs.org/
- **Bun** (faster than npm) → https://bun.sh/  
  Install on Windows (PowerShell):  
  `powershell -c "irm bun.sh/install.ps1 | iex"`  
  Install on macOS/Linux:  
  `curl -fsSL https://bun.sh/install | bash`
- **Git** → https://git-scm.com/

### 2. Get the code
In Lovable, click **GitHub → Connect to GitHub** (top right) and push the project
to your repo. Then:

```bash
git clone https://github.com/<your-username>/<your-repo>.git
cd <your-repo>
bun install
```

### 3. Run it
```bash
bun run dev
```
Open http://localhost:8080 in your browser. The app talks to the same
Lovable Cloud backend that the preview uses — no extra setup needed.

---

## Part 2 — Build the Android app (15–30 min the first time)

### 1. Install Android tools
- **Android Studio** → https://developer.android.com/studio  
  During install, accept the default SDK + Platform Tools. Open it once
  so it finishes downloading the SDK.
- **Java 21** ships with Android Studio — nothing extra to install.

### 2. Add the Android platform
From your project folder:
```bash
bun run build              # builds the web app into /dist
npx cap add android        # creates the /android folder (one-time)
npx cap sync android       # copies web build + plugins into Android
```

### 3. Run on a phone or emulator
**On your phone (USB):**
1. Enable Developer Mode + USB debugging on the phone
2. Plug it in and run:
   ```bash
   npx cap run android
   ```

**On an emulator:**
1. In Android Studio → Device Manager → Create Device → pick a Pixel
2. Run `npx cap run android` and pick the emulator

You should see Sprout running natively. Test the daily reminder:
go to **Profile → Notification preferences**, sign in, toggle the daily
reminder on, set a time 1 minute in the future, and lock the phone.
You'll get a real Android notification.

### 4. Every time you make changes
```bash
bun run build && npx cap sync android
# then either: npx cap run android   OR open Android Studio and press ▶
```

---

## Part 3 — Publish to Google Play Store

### 1. Create a Play Console account
- https://play.google.com/console (one-time **$25** registration fee)
- Verify your identity (takes a few days)

### 2. Generate a signing key (one-time)
This key proves you own the app forever — **back it up safely**.
```bash
keytool -genkey -v -keystore sprout-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias sprout
```
Remember the password and the file location.

### 3. Configure signing in Android Studio
1. Open the `android/` folder in Android Studio
2. **Build → Generate Signed Bundle / APK → Android App Bundle (.aab)**
3. Pick your `.jks` keystore, enter password
4. Build variant: **release**
5. Click Finish — `.aab` file is created in `android/app/release/`

### 4. Before submitting, do this checklist
Inside `capacitor.config.ts`, **remove the `server.url`** line for
production builds (otherwise the published app loads from Lovable preview).
Re-run `bun run build && npx cap sync android` then rebuild the `.aab`.

```ts
// capacitor.config.ts — production version
const config: CapacitorConfig = {
  appId: "app.lovable.ab44d158fddc4d1494ec1c66c50313d0",
  appName: "Sprout Habits",
  webDir: "dist",
  // server: { ... }  ← DELETE THIS BLOCK FOR PRODUCTION
  plugins: { /* ... */ },
};
```

### 5. Upload to Play Console
1. Play Console → **Create app** → fill in name, language, "App", "Free"
2. Left sidebar → **Production → Create new release**
3. Drag in your `.aab` file
4. Fill in:
   - **App content** (privacy policy URL, target audience, ads, data safety)
   - **Store listing** (screenshots, icon 512×512, feature graphic 1024×500)
   - **Content rating** questionnaire
5. Submit for review (takes 1–7 days the first time)

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `npx cap add android` fails | Make sure ANDROID_HOME env var is set. In Android Studio: File → Project Structure → SDK Location |
| Notifications don't fire on Android | Settings → Apps → Sprout → Notifications → enable. Also make sure battery optimization is off for Sprout |
| Google sign-in fails on device | Add your app's SHA-1 fingerprint in Google Cloud Console (Credentials). Get it via `cd android && ./gradlew signingReport` |
| Play Console rejects the app | Most common: missing privacy policy. Generate one at https://app-privacy-policy-generator.firebaseapp.com/ and host it on any URL |

---

## What lives where

```
project/
├── src/                      ← React app (web + native share this code)
├── supabase/                 ← Database migrations + edge functions
├── android/                  ← Auto-generated Android project (don't edit by hand)
├── capacitor.config.ts       ← Native app config
├── docs/                     ← This guide
└── package.json
```

You're done! 🌱
