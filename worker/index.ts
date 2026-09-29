interface Env {
  ASSETS: { fetch: typeof fetch };
  BASIC_AUTH_USER: string;
  BASIC_AUTH_PASSWORD: string;
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

    if (
      !timingSafeEqual(user, env.BASIC_AUTH_USER) ||
      !timingSafeEqual(pass, env.BASIC_AUTH_PASSWORD)
    ) {
      return unauthorized();
    }

    return env.ASSETS.fetch(request);
  },
};
