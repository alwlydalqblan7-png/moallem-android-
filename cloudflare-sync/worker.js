const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Moallem-Account",
  "Cache-Control": "no-store",
};
const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json; charset=utf-8", ...cors },
});
const encoder = new TextEncoder();
const hex = (bytes) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
const randomHex = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha256 = async (text) => hex(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
const passwordHash = async (password, salt) => {
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: Uint8Array.from(salt.match(/../g), (x) => parseInt(x, 16)), iterations: 210000, hash: "SHA-256" }, material, 256);
  return hex(bits);
};
const same = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};
const validEmail = (email) => /^[^\s@]{1,80}@[^\s@]{1,120}\.[^\s@]{2,40}$/.test(email);
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const MAX_CIPHERTEXT = 2_000_000;

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/health") return reply({ ok: true, service: "moallem-sync", encryption: "client-side AES-GCM" });
    if (!url.pathname.startsWith("/api/")) return reply({ error: "not_found" }, 404);

    const email = normalizeEmail(request.headers.get("X-Moallem-Account"));
    let body = {};
    if (["POST", "PUT"].includes(request.method)) {
      try { body = await request.json(); } catch { return reply({ error: "invalid_json" }, 400); }
    }
    const accountEmail = normalizeEmail(body.email || email);
    if (!validEmail(accountEmail)) return reply({ error: "invalid_email" }, 400);

    const accountId = env.SYNC_STORE.idFromName(await sha256(accountEmail));
    return env.SYNC_STORE.get(accountId).fetch(new Request("https://sync.internal" + url.pathname, {
      method: request.method,
      headers: { "Content-Type": "application/json", "Authorization": request.headers.get("Authorization") || "" },
      body: ["POST", "PUT"].includes(request.method) ? JSON.stringify({ ...body, email: accountEmail }) : undefined,
    }));
  },
};

export class SyncAccount {
  constructor(state) { this.state = state; }
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/register") return this.register(await request.json());
    if (request.method === "POST" && url.pathname === "/api/login") return this.login(await request.json());
    if (request.method === "POST" && url.pathname === "/api/logout") return this.logout(request);
    if (url.pathname === "/api/data" && request.method === "GET") return this.readData(request);
    if (url.pathname === "/api/data" && request.method === "PUT") return this.writeData(request, await request.json());
    return reply({ error: "not_found" }, 404);
  }
  async register({ email, password }) {
    if (!validEmail(email) || typeof password !== "string" || password.length < 8 || password.length > 256) return reply({ error: "invalid_credentials" }, 400);
    if (await this.state.storage.get("account")) return reply({ error: "account_exists" }, 409);
    const salt = randomHex();
    const account = { email, salt, hash: await passwordHash(password, salt), encryptionSalt: randomHex(), createdAt: new Date().toISOString() };
    await this.state.storage.put("account", account);
    return this.issueSession(account);
  }
  async login({ email, password }) {
    const account = await this.state.storage.get("account");
    if (!account || typeof password !== "string") return reply({ error: "invalid_credentials" }, 401);
    const key = "login:" + new Date().toISOString().slice(0, 13);
    const attempts = await this.state.storage.get(key) || 0;
    if (attempts >= 10) return reply({ error: "try_later" }, 429);
    const candidate = await passwordHash(password, account.salt);
    if (!same(candidate, account.hash)) {
      await this.state.storage.put(key, attempts + 1, { expirationTtl: 3600 });
      return reply({ error: "invalid_credentials" }, 401);
    }
    await this.state.storage.delete(key);
    return this.issueSession(account);
  }
  async issueSession(account) {
    const token = randomHex(32);
    const tokenHash = await sha256(token);
    const expiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000;
    await this.state.storage.put("session:" + tokenHash, expiresAt, { expirationTtl: 90 * 24 * 60 * 60 });
    return reply({ ok: true, token, expiresAt, encryptionSalt: account.encryptionSalt });
  }
  async authenticate(request) {
    const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const hash = await sha256(token);
    const expiry = await this.state.storage.get("session:" + hash);
    return Number(expiry) > Date.now() ? hash : false;
  }
  async logout(request) {
    const hash = await this.authenticate(request);
    if (hash) await this.state.storage.delete("session:" + hash);
    return reply({ ok: true });
  }
  async readData(request) {
    if (!await this.authenticate(request)) return reply({ error: "unauthorized" }, 401);
    return reply(await this.state.storage.get("snapshot") || { version: 0, snapshot: null });
  }
  async writeData(request, body) {
    if (!await this.authenticate(request)) return reply({ error: "unauthorized" }, 401);
    const current = await this.state.storage.get("snapshot") || { version: 0, snapshot: null };
    const expected = Number(body?.expectedVersion);
    const snapshot = body?.snapshot;
    if (!Number.isSafeInteger(expected) || expected !== current.version) return reply({ error: "version_conflict", ...current }, 409);
    if (!snapshot || typeof snapshot.iv !== "string" || typeof snapshot.ciphertext !== "string" ||
        snapshot.iv.length > 128 || snapshot.ciphertext.length > MAX_CIPHERTEXT ||
        !/^[a-f0-9]+$/i.test(snapshot.iv) || !/^[a-zA-Z0-9+/=_-]+$/.test(snapshot.ciphertext)) {
      return reply({ error: "invalid_snapshot" }, 400);
    }
    const next = { version: current.version + 1, snapshot, updatedAt: new Date().toISOString() };
    await this.state.storage.put("snapshot", next);
    return reply(next);
  }
}
