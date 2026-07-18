export const DEFAULT_DATABASE_URL = "postgresql://postgres@127.0.0.1:5432/journeyman";

export function databaseUrl() {
  return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

export function timezone() {
  return process.env.APP_TZ ?? "America/Denver";
}

export function requireTelegramBotToken() {
  const value = process.env.TELEGRAM_BOT_TOKEN;
  if (value) return value;
  throw new Error("TELEGRAM_BOT_TOKEN is required to start Telegram long-polling. Set it for future terminals with: setx TELEGRAM_BOT_TOKEN \"<bot-token>\"");
}