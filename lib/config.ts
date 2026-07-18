export const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/journeyman";

export function databaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function requireSessionSecret() {
  return requireValue("SESSION_SECRET", "complete a Telegram-linked browser login");
}

function requireValue(name: string, feature: string) {
  const value = process.env[name];
  if (value) return value;
  throw new Error(`${name} is required to ${feature}. Set it for future terminals with: setx ${name} "<value>"`);
}