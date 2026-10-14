import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
let manifest = readFileSync(manifestPath, "utf8");
const permission = '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';
if (!manifest.includes("android.permission.SCHEDULE_EXACT_ALARM")) {
  if (!manifest.includes("<application")) throw new Error("AndroidManifest.xml is missing the application element");
  manifest = manifest.replace("<application", `${permission}\n\n    <application`);
  writeFileSync(manifestPath, manifest);
}
