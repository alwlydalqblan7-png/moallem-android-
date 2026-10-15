import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const manifestPath = "android/app/src/main/AndroidManifest.xml";
const androidRoot = "android/app/src/main";
const config = JSON.parse(readFileSync("capacitor.config.json", "utf8"));
if (!config.appId) throw new Error("capacitor.config.json is missing appId");
const appId = config.appId;
const javaDir = join(androidRoot, "java", appId.replaceAll(".", "/"));
const copyTemplate = (source, destination, replacements = {}) => {
  let content = readFileSync(source, "utf8");
  for (const [token, value] of Object.entries(replacements)) content = content.replaceAll(token, value);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, content);
};

copyTemplate("native/android/java/MainActivity.java.in", join(javaDir, "MainActivity.java"), { "__APP_PACKAGE__": appId });
copyTemplate("native/android/java/HomeWidgetPlugin.java.in", join(javaDir, "HomeWidgetPlugin.java"), { "__APP_PACKAGE__": appId });
copyTemplate("native/android/java/BackupFilePlugin.java.in", join(javaDir, "BackupFilePlugin.java"), { "__APP_PACKAGE__": appId });
copyTemplate("native/android/java/HomeWidgetProvider.java.in", join(javaDir, "HomeWidgetProvider.java"), { "__APP_PACKAGE__": appId });
for (const resource of [
  "res/layout/moallem_widget.xml",
  "res/drawable/moallem_widget_background.xml",
  "res/drawable/moallem_widget_today.xml",
  "res/xml/moallem_widget_info.xml",
]) {
  copyTemplate(join("native/android", resource), join(androidRoot, resource));
}

let manifest = readFileSync(manifestPath, "utf8");
const permission = '    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />';
if (!manifest.includes("android.permission.SCHEDULE_EXACT_ALARM")) {
  if (!manifest.includes("<application")) throw new Error("AndroidManifest.xml is missing the application element");
  manifest = manifest.replace("<application", `${permission}\n\n    <application`);
  writeFileSync(manifestPath, manifest);
}
if (!manifest.includes('android:name=".HomeWidgetProvider"')) {
  const receiver = `\n        <receiver\n            android:name=".HomeWidgetProvider"\n            android:label="دفتر المعلّم"\n            android:exported="true">\n            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n            <meta-data android:name="android.appwidget.provider" android:resource="@xml/moallem_widget_info" />\n        </receiver>\n`;
  if (!manifest.includes("</application>")) throw new Error("AndroidManifest.xml is missing the application closing element");
  manifest = manifest.replace("</application>", `${receiver}    </application>`);
  writeFileSync(manifestPath, manifest);
}

const stringsPath = join(androidRoot, "res/values/strings.xml");
let strings = readFileSync(stringsPath, "utf8");
if (!strings.includes("name=\"moallem_widget_description\"")) {
  strings = strings.replace("</resources>", '    <string name="moallem_widget_description">بطاقة حصص اليوم من دفتر المعلّم</string>\n</resources>');
  writeFileSync(stringsPath, strings);
}

// Keep the release key outside Git and supply it through the CI/local build
// environment. Debug builds need no signing secret.
const appBuildPath = "android/app/build.gradle";
let appBuild = readFileSync(appBuildPath, "utf8");
const versionCode = Number(process.env.MOALLEM_VERSION_CODE || 1);
if (!Number.isSafeInteger(versionCode) || versionCode < 1) throw new Error("MOALLEM_VERSION_CODE must be a positive integer");
const versionName = process.env.MOALLEM_VERSION_NAME || `2.7.${versionCode}`;
appBuild = appBuild.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
appBuild = appBuild.replace(/versionName\s+['"][^'"]+['"]/, `versionName "${versionName.replaceAll('"', '')}"`);
const signingMarker = "MOALLEM_RELEASE_STORE_FILE";
if (!appBuild.includes(signingMarker)) {
  appBuild += `

// Optional production signing. Keep the keystore outside the repository.
def moallemReleaseStore = System.getenv("MOALLEM_RELEASE_STORE_FILE")
def moallemReleaseStorePassword = System.getenv("MOALLEM_RELEASE_STORE_PASSWORD")
def moallemReleaseKeyAlias = System.getenv("MOALLEM_RELEASE_KEY_ALIAS")
def moallemReleaseKeyPassword = System.getenv("MOALLEM_RELEASE_KEY_PASSWORD")
if ([moallemReleaseStore, moallemReleaseStorePassword, moallemReleaseKeyAlias, moallemReleaseKeyPassword].every { it }) {
    android.signingConfigs.create("moallemProduction") {
        storeFile rootProject.file(moallemReleaseStore)
        storePassword moallemReleaseStorePassword
        keyAlias moallemReleaseKeyAlias
        keyPassword moallemReleaseKeyPassword
    }
    android.buildTypes.release.signingConfig = android.signingConfigs.moallemProduction
}
`;
}
writeFileSync(appBuildPath, appBuild);
