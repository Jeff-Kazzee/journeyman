import { Bot, type Context } from "grammy";
import cron from "node-cron";
import { LoginLinkStatus } from "@prisma/client";
import { logCodexResolution } from "./codex.ts";
import { requireTelegramBotToken, timezone } from "./config.ts";
import { ConversationService, recoverInterruptedConversations, type ConversationResponse } from "./conversation.ts";
import { deliverScheduledTasks, nudgeStalledLearners } from "./daily.ts";
import { mentorMemory } from "./memory.ts";
import { prisma } from "./prisma.ts";

const isDryRun = process.argv.includes("--dry-run");
const isMemoryCheck = process.argv.includes("--check");
const appTimezone = timezone();

process.on("unhandledRejection", (reason) => console.error("[worker] unhandled rejection contained", reason));
process.on("uncaughtException", (error) => console.error("[worker] uncaught exception contained", error));

async function attachTelegramUser(telegramId: string, telegramUsername: string | undefined, code: string) {
  return prisma.$transaction(async (tx) => {
    const link = await tx.loginLink.findUnique({ where: { code } });
    if (!link || link.expiresAt <= new Date() || link.status !== LoginLinkStatus.PENDING) return false;
    const user = await tx.user.upsert({ where: { telegramId }, update: { telegramUsername }, create: { telegramId, telegramUsername, slug: `telegram-${telegramId}` } });
    await tx.loginLink.update({ where: { id: link.id }, data: { userId: user.id, status: LoginLinkStatus.LINKED, linkedAt: new Date() } });
    return true;
  });
}

async function sendResponse(bot: Bot, userId: string, result: ConversationResponse): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { telegramId: true } });
  if (!user?.telegramId) return;
  for (const message of result.messages) await bot.api.sendMessage(user.telegramId, message);
}

async function replyForLinked(ctx: Context, action: (userId: string) => Promise<ConversationResponse>) {
  try {
    if (!ctx.from) return ctx.reply("I could not identify this Telegram account. Please try again.");
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { id: true } });
    if (!user) return ctx.reply("Connect this chat first with /link CODE from the Journeyman web page.");
    const result = await action(user.id);
    for (const message of result.messages) await ctx.reply(message);
  } catch (error) {
    console.error("[worker] Telegram conversation handler failed", error);
    await ctx.reply("I hit a snag on my side — your state is safe. Send /retry to try the last step again.").catch(() => undefined);
  }
}

function installCronJobs(bot: Bot) {
  const send = async (telegramId: string, text: string) => { await bot.api.sendMessage(telegramId, text); };
  cron.schedule("0 7 * * *", () => { void deliverScheduledTasks(send).catch((error: unknown) => console.error("[cron] 07:00 delivery failed", error)); }, { timezone: appTimezone });
  cron.schedule("0 19 * * *", () => { void nudgeStalledLearners(send).catch((error: unknown) => console.error("[cron] 19:00 nudge failed", error)); }, { timezone: appTimezone });
  console.log(`[worker] daily cards 07:00, nudge 19:00 (${appTimezone}). Task #1 arrives immediately when a plan is confirmed — cron is only for later days.`);
}

function createBot(token: string) {
  const bot = new Bot(token);
  const conversation = new ConversationService(undefined, undefined, (userId, result) => sendResponse(bot, userId, result));
  bot.catch(async (error) => {
    console.error("[worker] grammY update failure contained", error.error);
    await error.ctx.reply("I hit a snag on my side — your state is safe. Send /retry to try the last step again.").catch(() => undefined);
  });
  bot.command("link", async (ctx) => {
    const code = ctx.match.trim().toUpperCase();
    if (!code) return ctx.reply("Send /link followed by the eight-character code shown in your browser.");
    if (!ctx.from) return ctx.reply("I could not identify this Telegram account. Please try again.");
    try {
      const linked = await attachTelegramUser(String(ctx.from.id), ctx.from.username, code);
      return ctx.reply(linked ? "Connected. Return to the browser and your Journeyman dashboard will open. When you are ready, send /start here for the intake." : "That code is invalid, expired, or already used. Generate a fresh one in the browser.");
    } catch {
      return ctx.reply("The link service is not connected yet. Check local PostgreSQL and try again.");
    }
  });
  for (const command of ["start", "help", "cancel", "done", "undo", "retry", "task", "plan", "progress", "pause", "resume", "transcript"] as const) {
    bot.command(command, (ctx) => replyForLinked(ctx, (userId) => command === "start" ? conversation.startOnboarding(userId) : conversation.handleCommand(userId, `/${command}`)));
  }
  bot.on("message:text", (ctx) => replyForLinked(ctx, (userId) => conversation.handleMessage(userId, ctx.message.text)));
  return bot;
}

async function main() {
  if (isMemoryCheck) { console.log(await mentorMemory.check() ? "bellamente: up" : "bellamente: down (optional, continuing without it)"); return; }
  if (isDryRun) { console.log(`[worker] dry run: cron would start in ${appTimezone} (07:00 delivery, 19:00 nudge).`); console.log("[worker] dry run: Telegram long-poll bot would start."); return; }
  const recovered = await recoverInterruptedConversations(); if (recovered) console.log(`[worker] marked ${recovered} interrupted conversation run${recovered === 1 ? "" : "s"} retryable.`);
  logCodexResolution();
  const bot = createBot(requireTelegramBotToken()); installCronJobs(bot); console.log("[worker] starting Telegram long-polling bot.");
  await bot.start({ onStart: (info) => console.log(`[worker] connected as @${info.username}`) });
}

main().catch((error) => { console.error("[worker] fatal boot error", error); }).finally(async () => { if (isDryRun || isMemoryCheck) await prisma.$disconnect(); });
