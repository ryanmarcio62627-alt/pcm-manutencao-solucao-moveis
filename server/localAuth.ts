import { jwtVerify, SignJWT } from "jose";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { localAccounts } from "../drizzle/schema";
import { getDb } from "./db";
import { eq } from "drizzle-orm";

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

const scrypt = promisify(scryptCallback);

export async function hashLocalPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyLocalPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

export async function authenticateLocalLogin(username: string, password: string): Promise<LocalSession | null> {
  const normalized = username.trim().toLowerCase();
  const db = await getDb();
  if (db) {
    const rows = await db.select().from(localAccounts).where(eq(localAccounts.username, normalized)).limit(1);
    const account = rows[0];
    if (account && account.active && await verifyLocalPassword(password, account.passwordHash)) {
      return { username: account.username, role: account.role };
    }
  }
  return validateLocalLogin(normalized, password);
}

export async function createLocalAccount(input: { username: string; displayName: string; password: string; role: LocalRole }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new Error("Usuário deve ter pelo menos 3 caracteres e usar apenas letras, números, ponto, hífen ou sublinhado.");
  if (input.password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
  const [created] = await db.insert(localAccounts).values({ username, displayName: input.displayName.trim(), passwordHash: await hashLocalPassword(input.password), role: input.role, active: true }).$returningId();
  return { ...created, username, displayName: input.displayName.trim(), role: input.role, active: true };
}

export async function listLocalAccounts() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: localAccounts.id, username: localAccounts.username, displayName: localAccounts.displayName, role: localAccounts.role, active: localAccounts.active, createdAt: localAccounts.createdAt }).from(localAccounts).orderBy(localAccounts.displayName);
}

export async function setLocalAccountActive(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(localAccounts).set({ active }).where(eq(localAccounts.id, id));
  return { id, active };
}

export async function resetLocalAccountPassword(id: number, password: string) {
  if (password.length < 8) throw new Error("A senha deve ter pelo menos 8 caracteres.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(localAccounts).set({ passwordHash: await hashLocalPassword(password) }).where(eq(localAccounts.id, id));
  return { id, success: true } as const;
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
