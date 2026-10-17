// Vercel function: checks Jeff's admin password so it never has to ship in
// app.js. Set JEFF_ADMIN_PASSWORD in the Vercel project's environment
// variables; until it is set, every attempt is refused.
export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ ok: false });
  }

  const expected = process.env.JEFF_ADMIN_PASSWORD || "";
  const given = typeof request.body?.adminPassword === "string" ? request.body.adminPassword : "";
  const ok = Boolean(expected) && given === expected;

  response.setHeader("Cache-Control", "no-store");
  return response.status(ok ? 200 : 403).json({ ok });
}
