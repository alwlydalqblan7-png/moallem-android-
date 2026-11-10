const API = import.meta.env.VITE_SYNC_API_URL || "https://moallem-sync.liondangerous65.workers.dev";
const PREFIX = "m2_";
const ACCOUNT_KEY = "moallem.sync.account";
const DB_NAME = "moallem_cloud_sync";
const STORE = "state";
let account = null, cryptoKey = null, baseline = null, version = 0, busy = false, applying = false, timer = 0;
const enc = new TextEncoder(), dec = new TextDecoder();
const toB64 = (bytes) => {
  const view = new Uint8Array(bytes); let binary = "";
  for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
  return btoa(binary);
};
const fromB64 = (text) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
const toHex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const localKeys = () => Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)).filter(Boolean);
const localData = () => Object.fromEntries(localKeys().filter((k) => k.startsWith(PREFIX)).sort().map((k) => [k, localStorage.getItem(k)]));
const emptyData = (data) => Object.keys(data || {}).length === 0;
const sameData = (a, b) => {
  const stable = (value) => JSON.stringify(Object.fromEntries(Object.entries(value || {}).sort(([x], [y]) => x.localeCompare(y))));
  return stable(a) === stable(b);
};
const api = async (path, method = "GET", body = null, auth = true) => {
  if (!API) throw new Error("عنوان خدمة المزامنة غير مضبوط.");
  const headers = { "Content-Type": "application/json" };
  if (auth && account) { headers.Authorization = "Bearer " + account.token; headers["X-Moallem-Account"] = account.email; }
  const res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.error || "تعذر الاتصال"); e.code = data.error; e.data = data; throw e; }
  return data;
};
const db = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const localGet = async (key) => { const d = await db(); return new Promise((resolve, reject) => { const r = d.transaction(STORE).objectStore(STORE).get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); };
const localPut = async (key, value) => { const d = await db(); return new Promise((resolve, reject) => { const r = d.transaction(STORE, "readwrite").objectStore(STORE).put(value, key); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }); };
const localDelete = async (key) => { const d = await db(); return new Promise((resolve, reject) => { const r = d.transaction(STORE, "readwrite").objectStore(STORE).delete(key); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }); };
const deriveKey = async (password, saltHex) => {
  const material = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
  const salt = Uint8Array.from(saltHex.match(/../g), (x) => parseInt(x, 16));
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 250000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
};
const encrypt = async (data) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cryptoKey, enc.encode(JSON.stringify(data)));
  return { iv: toB64(iv), ciphertext: toB64(cipher) };
};
const decrypt = async (snapshot) => {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(snapshot.iv) }, cryptoKey, fromB64(snapshot.ciphertext));
  const value = JSON.parse(dec.decode(plain));
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.keys(value).some((k) => !k.startsWith(PREFIX))) throw new Error("تعذّر التحقق من بيانات الحساب.");
  return value;
};
const saveAccount = () => localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
const restoreAccount = async () => {
  try {
    account = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || "null");
    if (!account?.email || !account?.token) return false;
    cryptoKey = await localGet("key:" + account.email);
    baseline = await localGet("baseline:" + account.email) || null;
    version = Number(account.version) || 0;
    return Boolean(cryptoKey);
  } catch { account = null; return false; }
};
const applyData = async (data) => {
  const backup = localData();
  await localPut("pre-sync-backup:" + account.email, backup);
  applying = true;
  try {
    for (const key of localKeys()) if (key.startsWith(PREFIX) && !(key in data)) localStorage.removeItem(key);
    for (const [key, value] of Object.entries(data)) localStorage.setItem(key, value);
    baseline = data; await localPut("baseline:" + account.email, data);
    setTimeout(() => location.reload(), 250);
  } finally { setTimeout(() => { applying = false; }, 1000); }
};
let banner, dialog, statusText;
const status = (message, kind = "") => { if (statusText) { statusText.textContent = message; statusText.dataset.kind = kind; } };
const localHasData = () => !emptyData(localData());
const mergeThreeWay = (base, local, remote) => {
  const merged = {}, conflicts = [];
  const keys = new Set([...Object.keys(base || {}), ...Object.keys(local || {}), ...Object.keys(remote || {})]);
  for (const key of keys) {
    const b = base?.[key] ?? null, l = local?.[key] ?? null, r = remote?.[key] ?? null;
    if (l === b) { if (r !== null) merged[key] = r; }
    else if (r === b || l === r) { if (l !== null) merged[key] = l; }
    else conflicts.push(key);
  }
  return { merged, conflicts };
};
const upload = async (data, expected) => {
  const snapshot = await encrypt(data);
  const result = await api("/api/data", "PUT", { expectedVersion: expected, snapshot });
  version = result.version; account.version = version; saveAccount();
  baseline = data; await localPut("baseline:" + account.email, data);
  status("تمت المزامنة الآن", "ok");
};
const readRemote = async () => api("/api/data");
const showConflict = (local, remote, remoteVersion, label = "وجدنا بيانات محفوظة على هذا الجهاز وفي الحساب.") => {
  openDialog(label + " اختر النسخة التي تريد اعتمادها. سنحتفظ بنسخة محلية قبل الاستبدال.", [
    ["اعتماد بيانات الحساب", async () => { const cloud = await decrypt(remote); await applyData(cloud); }],
    ["اعتماد بيانات هذا الجهاز", async () => { await upload(local, remoteVersion); closeDialog(); }],
  ]);
};
const synchronize = async () => {
  if (!account || !cryptoKey || busy || !navigator.onLine) { if (!navigator.onLine) status("غير متصل؛ ستبقى البيانات على الجهاز", "offline"); return; }
  busy = true; status("جارٍ مزامنة البيانات…");
  try {
    const remote = await readRemote(), local = localData(), remoteVersion = Number(remote.version) || 0;
    version = remoteVersion; account.version = version; saveAccount();
    if (!remote.snapshot) {
      await upload(local, remoteVersion); return;
    }
    const cloud = await decrypt(remote.snapshot);
    if (!baseline) {
      if (emptyData(local)) { await applyData(cloud); return; }
      if (sameData(local, cloud)) { baseline = local; await localPut("baseline:" + account.email, local); status("الجهاز متصل بالحساب", "ok"); return; }
      showConflict(local, remote.snapshot, remoteVersion, "هذه أول مزامنة لهذا الجهاز، ووجدنا بيانات محفوظة في الحساب وعلى الجهاز.");
      return;
    }
    const localChanged = !sameData(local, baseline), cloudChanged = !sameData(cloud, baseline);
    if (!localChanged && !cloudChanged) { status("البيانات محدّثة", "ok"); return; }
    if (!localChanged && cloudChanged) { await applyData(cloud); return; }
    if (localChanged && !cloudChanged) { await upload(local, remoteVersion); return; }
    const { merged, conflicts } = mergeThreeWay(baseline, local, cloud);
    if (conflicts.length) { showConflict(local, remote.snapshot, remoteVersion, "تغيّرت بعض البيانات نفسها على الجهازين. اختر أي نسخة تريد اعتمادها."); return; }
    await upload(merged, remoteVersion);
  } catch (error) {
    if (error.code === "unauthorized") { logoutLocal(); status("انتهت الجلسة؛ سجّل الدخول من جديد", "error"); }
    else if (error.code === "version_conflict") { scheduleSync(100); }
    else status(error.message || "تعذرت المزامنة", "error");
  } finally { busy = false; }
};
const scheduleSync = (delay = 1400) => { clearTimeout(timer); if (account) timer = setTimeout(synchronize, delay); };
const logoutLocal = () => {
  if (account?.email) { localDelete("key:" + account.email); localDelete("baseline:" + account.email); }
  localStorage.removeItem(ACCOUNT_KEY); account = null; cryptoKey = null; baseline = null; version = 0; render();
};
const closeDialog = () => { dialog?.remove(); dialog = null; };
const openDialog = (message, actions) => {
  closeDialog();
  dialog = document.createElement("div"); dialog.className = "moallem-sync-shade";
  const card = document.createElement("section"); card.className = "moallem-sync-dialog"; card.dir = "rtl";
  const p = document.createElement("p"); p.textContent = message; card.append(p);
  for (const [label, action] of actions) {
    const b = document.createElement("button"); b.textContent = label; b.onclick = async () => { b.disabled = true; try { await action(); } catch (e) { status(e.message, "error"); closeDialog(); } };
    card.append(b);
  }
  const cancel = document.createElement("button"); cancel.className = "secondary"; cancel.textContent = "لاحقًا"; cancel.onclick = closeDialog; card.append(cancel);
  dialog.append(card); document.body.append(dialog);
};
const render = () => {
  if (!banner) {
    const style = document.createElement("style");
    style.textContent = `.moallem-sync-pill{position:fixed;z-index:9998;left:14px;top:14px;border:1px solid #ccd8e5;border-radius:999px;padding:8px 13px;background:#fff;color:#173b5b;font:600 13px Arial;box-shadow:0 3px 14px #18355022;cursor:pointer}.moallem-sync-shade{position:fixed;inset:0;z-index:10000;background:#07162588;display:grid;place-items:center;padding:18px}.moallem-sync-dialog{width:min(460px,100%);box-sizing:border-box;padding:22px;border-radius:18px;background:#fff;box-shadow:0 20px 80px #0004;color:#17324b;font:15px/1.7 Arial}.moallem-sync-dialog h2{margin:0 0 10px;font-size:21px}.moallem-sync-dialog label{display:block;margin:10px 0 4px}.moallem-sync-dialog input{box-sizing:border-box;width:100%;padding:11px;border:1px solid #cbd7e2;border-radius:9px;font:inherit}.moallem-sync-dialog button{display:block;width:100%;margin-top:9px;padding:11px;border:0;border-radius:9px;background:#1c5d82;color:#fff;font:inherit;font-weight:700;cursor:pointer}.moallem-sync-dialog button.secondary{background:#edf2f6;color:#24445e}.moallem-sync-dialog button:disabled{opacity:.6}.moallem-sync-dialog .hint{font-size:12px;color:#5b6c7b}.moallem-sync-dialog [data-kind=error]{color:#a32121}.moallem-sync-pill[data-kind=error]{color:#a32121;border-color:#efb8b8}.moallem-sync-pill[data-kind=offline]{color:#795c19}.moallem-sync-pill[data-kind=ok]{color:#246640}`;
    document.head.append(style);
    banner = document.createElement("button"); banner.className = "moallem-sync-pill"; banner.onclick = openPanel; document.body.append(banner);
  }
  banner.dataset.kind = account ? (navigator.onLine ? "ok" : "offline") : "";
  banner.textContent = account ? (navigator.onLine ? "معلّم • مزامنة" : "معلّم • دون إنترنت") : "مزامنة معلّم";
};
const openPanel = () => {
  closeDialog(); dialog = document.createElement("div"); dialog.className = "moallem-sync-shade";
  const card = document.createElement("section"); card.className = "moallem-sync-dialog"; card.dir = "rtl";
  const title = document.createElement("h2"); title.textContent = "مزامنة بيانات معلّم"; card.append(title);
  statusText = document.createElement("p"); statusText.textContent = account ? "الحساب: " + account.email : "سجّل الدخول أو أنشئ حسابًا لربط الجوال باللابتوب."; card.append(statusText);
  if (!account) {
    const emailLabel = document.createElement("label"); emailLabel.textContent = "البريد الإلكتروني"; card.append(emailLabel);
    const email = document.createElement("input"); email.type = "email"; email.autocomplete = "username"; email.placeholder = "name@example.com"; card.append(email);
    const pwLabel = document.createElement("label"); pwLabel.textContent = "كلمة المرور"; card.append(pwLabel);
    const password = document.createElement("input"); password.type = "password"; password.autocomplete = "current-password"; password.placeholder = "12 حرفًا على الأقل"; card.append(password);
    const hint = document.createElement("p"); hint.className = "hint"; hint.textContent = "البيانات تُشفّر على جهازك قبل الإرسال. استخدم الحساب نفسه على الجوال واللابتوب. كلمة المرور لا يمكن استعادتها؛ احتفظ بها."; card.append(hint);
    const submit = async (path) => {
      submitLogin.disabled = submitRegister.disabled = true; status("جارٍ الاتصال بالحساب…");
      try {
        const cleanEmail = email.value.trim().toLowerCase(), pass = password.value;
        if (!/^[^\s@]{1,80}@[A-Za-z0-9.-]{1,120}\.[A-Za-z]{2,40}$/.test(cleanEmail)) throw new Error("أدخل بريدًا إلكترونيًا صحيحًا.");
        if (pass.length < 12 || pass.length > 256) throw new Error("يجب أن تتكون كلمة المرور من 12 إلى 256 حرفًا.");
        if (!navigator.onLine) throw new Error("اتصل بالإنترنت لإعداد المزامنة أول مرة.");
        let result;
        try { result = await api(path, "POST", { email: cleanEmail, password: pass }, false); }
        catch (e) {
          if (path !== "/api/register" || e.code !== "account_exists") throw e;
          result = await api("/api/login", "POST", { email: cleanEmail, password: pass }, false);
        }
        account = { email: cleanEmail, token: result.token, version: 0 };
        cryptoKey = await deriveKey(pass, result.encryptionSalt);
        await localPut("key:" + account.email, cryptoKey); saveAccount(); baseline = null;
        closeDialog(); render(); await synchronize();
      } catch (e) {
        const message = e.code === "account_exists" ? "هذا البريد مسجل سابقًا. سجّل الدخول بكلمة المرور نفسها." :
          e.code === "invalid_credentials" ? (path === "/api/register" ? "تعذر إنشاء الحساب. تحقق من البريد وكلمة المرور (12 حرفًا على الأقل)." : "تعذر تسجيل الدخول؛ تحقق من البريد وكلمة المرور.") :
          e.code === "snapshot_too_large" ? "حجم البيانات كبير للمزامنة. أنشئ نسخة احتياطية للصور واحذف الصور الكبيرة ثم أعد المحاولة." : e.message;
        statusText.textContent = message;
      }
      finally { submitLogin.disabled = submitRegister.disabled = false; }
    };
    const submitLogin = document.createElement("button"); submitLogin.textContent = "تسجيل الدخول"; submitLogin.onclick = () => submit("/api/login"); card.append(submitLogin);
    const submitRegister = document.createElement("button"); submitRegister.className = "secondary"; submitRegister.textContent = "إنشاء حساب جديد"; submitRegister.onclick = () => submit("/api/register"); card.append(submitRegister);
  } else {
    const syncButton = document.createElement("button"); syncButton.textContent = "زامن الآن"; syncButton.onclick = () => { closeDialog(); synchronize(); }; card.append(syncButton);
    const logoutButton = document.createElement("button"); logoutButton.className = "secondary"; logoutButton.textContent = "تسجيل الخروج من هذا الجهاز"; logoutButton.onclick = async () => { try { await api("/api/logout", "POST", {}); } catch {} logoutLocal(); closeDialog(); }; card.append(logoutButton);
    const hint = document.createElement("p"); hint.className = "hint"; hint.textContent = "تتم مزامنة بيانات الطلاب والعلامات والحضور والتحضيرات تلقائيًا عند توفر الإنترنت. ملفات الكتب PDF تبقى على كل جهاز."; card.append(hint);
  }
  const close = document.createElement("button"); close.className = "secondary"; close.textContent = "إغلاق"; close.onclick = closeDialog; card.append(close);
  dialog.append(card); dialog.onclick = (e) => { if (e.target === dialog) closeDialog(); }; document.body.append(dialog);
};
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  originalSetItem.call(this, key, value);
  if (this === localStorage && String(key).startsWith(PREFIX) && !applying) scheduleSync();
};
const originalRemoveItem = Storage.prototype.removeItem;
Storage.prototype.removeItem = function(key) {
  originalRemoveItem.call(this, key);
  if (this === localStorage && String(key).startsWith(PREFIX) && !applying) scheduleSync();
};
window.addEventListener("storage", (event) => { if (event.key?.startsWith(PREFIX)) scheduleSync(250); });
window.addEventListener("online", () => { render(); scheduleSync(300); });
window.addEventListener("offline", render);
window.addEventListener("focus", () => scheduleSync(250));
document.addEventListener("visibilitychange", () => { if (!document.hidden) scheduleSync(250); });
setInterval(() => { if (account && !document.hidden) synchronize(); }, 45000);
window.addEventListener("DOMContentLoaded", async () => {
  render();
  if (await restoreAccount()) { render(); if (navigator.onLine) synchronize(); }
});
