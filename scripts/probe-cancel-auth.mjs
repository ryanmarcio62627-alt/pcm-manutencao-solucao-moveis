import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET || "local-development-secret");
const token = await new SignJWT({ username: "ryan", role: "pcm" })
  .setProtectedHeader({ alg: "HS256" })
  .setIssuedAt()
  .setExpirationTime("12h")
  .sign(secret);

const response = await fetch("http://127.0.0.1:3000/api/trpc/preventives.cancel?batch=1", {
  method: "POST",
  headers: { "content-type": "application/json", cookie: `pcm_session=${token}` },
  body: JSON.stringify({ 0: { json: { id: 999999999, reason: "probe de autenticação" } } }),
});
const text = await response.text();
console.log(JSON.stringify({ status: response.status, body: text.slice(0, 500) }));
