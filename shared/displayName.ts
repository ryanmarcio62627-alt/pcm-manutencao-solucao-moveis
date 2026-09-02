export function formatLocalUserName(username?: string | null) {
  const normalized = username?.trim();
  if (!normalized) return "usuário";
  return normalized
    .replace(/[._-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}
