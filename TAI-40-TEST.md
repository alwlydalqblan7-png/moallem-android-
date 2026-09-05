# TAI-40 — V2.5 Validation

## Static review completed
- UI identity keeps navy `#1C3F66` and sky `#4FB7FF`.
- One icon library is used: `lucide-react`.
- Main screens keep RTL layout and mobile-first responsive rules.
- Existing student, attendance, gradebook, print, settings, and AI logic was retained.
- Android application id was intentionally left unchanged to preserve upgrade compatibility.

## Build status
Local dependency installation could not complete in the execution environment because `npm install` hit the environment timeout before `node_modules` was created. No code/compiler error was produced.

## Required final Android regression test
1. Run `npm install`.
2. Run `npm run build`.
3. Run `npx cap add android` only if the Android folder does not exist.
4. Run `npx @capacitor/assets generate --android --iconBackgroundColor '#1C3F66' --iconBackgroundColorDark '#1C3F66' --splashBackgroundColor '#1C3F66' --splashBackgroundColorDark '#1C3F66'`.
5. Run `npx cap sync android`.
6. Build and install the debug APK.
7. Test: navigation, students CRUD/move, attendance, gradebook edit/marks, print/report cards, settings CRUD, online AI, offline fallback, RTL, small-screen layout, app icon and splash.
