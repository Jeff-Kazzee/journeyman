import { Bot, type Context } from "grammy";
import cron from "node-cron";
import { LoginLinkStatus } from "@prisma/client";
import { requireTelegramBotToken, timezone } from "./config.ts";
import { ConversationService, type ConversationResponse } from "./conversation.ts";
import { deliverScheduledTasks, nudgeStalledLearners } from "./daily.ts";
import { mentorMemory } from "./memory.ts";
import { prisma } from "./prisma.ts";

const isDryRun = process.argv.includes("--dry-run");
const isMemoryCheck = process.argv.includes("--check");
const appTimezone = timezone();

async function attachTelegramUser(telegramId: string, telegramUsername: string | undefined, code: string) {
  return prisma.$transaction(async (tx) => {
    const link = await tx.loginLink.findUnique({ where: { code } });
    if (!link || link.expiresAt <= new Date() || link.status !== LoginLinkStatus.PENDING) return false;

    const user = await tx.user.upsert({
      where: { telegramId },
      update: { telegramUsername },
      create: { telegramId, telegramUsername, slug: `telegram-${telegramId}` },
    });
    await tx.loginLink.update({
      where: { id: link.id },
      data: { userId: user.id, status: LoginLinkStatus.LINKED, linkedAt: new Date() },
    });
    return true;
  });
}

async function replyConversation(ctx: Context, response: Promise<ConversationResponse>) {
  if (!ctx.from) return ctx.reply("I could not identify this Telegram account. Please try again.");
  const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { id: true } });
  if (!user) return ctx.reply("Connect this chat first with /link CODE from the Journeyman web page.");
  const result = await response;
  for (const message of result.messages) await ctx.reply(message);
}

function installCronJobs(bot: Bot) {
  const send = async (telegramId: string, text: string) => {
    await bot.api.sendMessage(telegramId, text);
  };
  cron.schedule("0 7 * * *", () => {
    void deliverScheduledTasks(send).catch((error: unknown) => console.error("[cron] 07:00 delivery failed", error));
  }, { timezone: appTimezone });
  cron.schedule("0 19 * * *", () => {
    void nudgeStalledLearners(send).catch((error: unknown) => console.error("[cron] 19:00 nudge failed", error));
  }, { timezone: appTimezone });
  console.log(`[worker] cron scheduled in ${appTimezone}: task delivery 07:00, stall nudge 19:00.`);
}

function createBot(token: string) {
  const bot = new Bot(token);
  const conversation = new ConversationService();

  bot.command("start", (ctx) => replyConversation(ctx, (async () => {
    if (!ctx.from) return { messages: ["I could not identify this Telegram account. Please try again."] };
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { id: true } });
    return user
      ? conversation.startOnboarding(user.id)
      : { messages: ["Welcome to Journeyman. Use /link CODE from the web page to connect this chat."] };
  })()));
  bot.command("help", (ctx) => replyConversation(ctx, (async () => {
    if (!ctx.from) return { messages: ["I could not identify this Telegram account. Please try again."] };
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { id: true } });
    return user
      ? conversation.handleCommand(user.id, "/help")
      : { messages: ["For now: /start, /link CODE, and /help. Connect your chat first to begin onboarding."] };
  })()));
  bot.command("link", async (ctx) => {
    const code = ctx.match.trim().toUpperCase();
    if (!code) return ctx.reply("Send /link followed by the eight-character code shown in your browser.");
    if (!ctx.from) return ctx.reply("I could not identify this Telegram account. Please try again.");
    try {
      const linked = await attachTelegramUser(String(ctx.from.id), ctx.from.username, code);
      return ctx.reply(linked
        ? "Connected. Return to the browser and your Journeyman dashboard will open. When you are ready, send /start here for the intake."
        : "That code is invalid, expired, or already used. Generate a fresh one in the browser.");
    } catch {
      return ctx.reply("The link service is not connected yet. Check local PostgreSQL and try again.");
    }
  });

  for (const command of ["cancel", "done", "task", "plan", "progress", "pause", "resume", "transcript"] as const) {
    bot.command(command, (ctx) => replyConversation(ctx, (async () => {
      if (!ctx.from) return { messages: ["I could not identify this Telegram account. Please try again."] };
      const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { id: true } });
      return user
        ? conversation.handleCommand(user.id, `/${command}`)
        : { messages: ["Connect this chat first with /link CODE from the Journeyman web page."] };
    })()));
  }

  bot.on("message:text", (ctx) => replyConversation(ctx, (async () => {
    if (!ctx.from) return { messages: ["I could not identify this Telegram account. Please try again."] };
    const user = await prisma.user.findUnique({ where: { telegramId: String(ctx.from.id) }, select: { id: true } });
    return user
      ? conversation.handleMessage(user.id, ctx.message.text)
      : { messages: ["Connect this chat first with /link CODE from the Journeyman web page."] };
  })()));
  return bot;
}

async function main() {
  if (isMemoryCheck) {
    console.log(await mentorMemory.check() ? "bellamente: up" : "bellamente: down (optional, continuing without it)");
    return;
  }
  if (isDryRun) {
    console.log(`[worker] dry run: cron would start in ${appTimezone} (07:00 delivery, 19:00 nudge).`);
    console.log("[worker] dry run: Telegram long-poll bot would start.");
    return;
  }

  const bot = createBot(requireTelegramBotToken());
  installCronJobs(bot);
  console.log("[worker] starting Telegram long-polling bot.");
  await bot.start({ onStart: (botInfo) => console.log(`[worker] connected as @${botInfo.username}`) });
}

main()
  .catch((error) => { console.error("[worker] fatal", error); process.exitCode = 1; })
  .finally(async () => { if (isDryRun || isMemoryCheck) await prisma.$disconnect(); });