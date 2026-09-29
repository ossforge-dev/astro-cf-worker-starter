interface Env {
  ASSETS: { fetch: typeof fetch };
  BASIC_AUTH_USER: string;
  BASIC_AUTH_PASSWORD: string;
  // Optional. When set, supersedes BASIC_AUTH_PASSWORD with a password that
  // changes every UTC day, derived from this seed — see deriveDailyPassword
  // below and the "Rotating demo password" section in the README. Meant for
  // a public demo deployment where the password gets published; a real
  // private site should just leave this unset and use a static password.
  BASIC_AUTH_SEED?: string;
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let mismatch = 0;
  for (let i = 0; i < aBytes.length; i++) {
    mismatch |= aBytes[i] ^ bBytes[i];
  }
  return mismatch === 0;
}

function utcDateString(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Same derivation as .github/scripts/rotate-demo-password.mjs, which
// publishes today's value into the README on the same daily schedule. Keep
// the two in sync if this changes.
async function deriveDailyPassword(seed: string, offsetDays: number): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(seed),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(utcDateString(offsetDays)));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `Demo-${hex.slice(0, 16)}`;
}

async function checkPassword(env: Env, submitted: string): Promise<boolean> {
  if (!env.BASIC_AUTH_SEED) {
    return timingSafeEqual(submitted, env.BASIC_AUTH_PASSWORD);
  }
  // Accept today's and yesterday's derived password, so a submitted value
  // stays valid through the few minutes between the UTC day rolling over
  // and the daily workflow republishing the new one in the README.
  const [today, yesterday] = await Promise.all([
    deriveDailyPassword(env.BASIC_AUTH_SEED, 0),
    deriveDailyPassword(env.BASIC_AUTH_SEED, -1),
  ]);
  const matchesToday = timingSafeEqual(submitted, today);
  const matchesYesterday = timingSafeEqual(submitted, yesterday);
  return matchesToday || matchesYesterday;
}

function unauthorized(): Response {
  return new Response("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Site", charset="UTF-8"' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const auth = request.headers.get("Authorization");
    if (!auth?.startsWith("Basic ")) return unauthorized();

    let decoded: string;
    try {
      decoded = atob(auth.slice("Basic ".length));
    } catch {
      return unauthorized();
    }

    const sep = decoded.indexOf(":");
    if (sep === -1) return unauthorized();

    const user = decoded.slice(0, sep);
    const pass = decoded.slice(sep + 1);

    if (!timingSafeEqual(user, env.BASIC_AUTH_USER) || !(await checkPassword(env, pass))) {
      return unauthorized();
    }

    return env.ASSETS.fetch(request);
  },
};
