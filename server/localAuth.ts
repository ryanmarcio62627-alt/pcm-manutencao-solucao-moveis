import { jwtVerify, SignJWT } from "jose";

export type LocalRole = "pcm" | "campo";
export type LocalSession = { username: string; role: LocalRole };

const COOKIE_NAME = "pcm_session";
const encoder = new TextEncoder();

function safeEqual(left: string, right: string) {
  if (!left || !right || left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

export function validateLocalLogin(username: string, password: string): LocalSession | null {
  const normalized = username.trim().toLowerCase();
  if (normalized === "ryan" && safeEqual(password, process.env.PCM_ADMIN_PASSWORD ?? "")) {
    return { username: "ryan", role: "pcm" };
  }
  if (normalized === "campo" && safeEqual(password, process.env.PCM_FIELD_PASSWORD ?? "")) {
    return { username: "campo", role: "campo" };
  }
  return null;
}

export async function createLocalToken(session: LocalSession) {
  return new SignJWT(session)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(encoder.encode(process.env.JWT_SECRET ?? "local-development-secret"));
}

export async function getLocalSession(req: { headers?: { cookie?: string } }): Promise<LocalSession | null> {
  const cookieHeader = req.headers?.cookie ?? "";
  const token = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, encoder.encode(process.env.JWT_SECRET ?? "local-development-secret"));
    if ((payload.role !== "pcm" && payload.role !== "campo") || typeof payload.username !== "string") return null;
    return { role: payload.role, username: payload.username };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };
