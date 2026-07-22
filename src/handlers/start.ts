import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "🌍 Browse Numbers", data: "browse:countries", order: 10 });
registerMainMenuItem({ label: "📋 My Numbers", data: "orders:history", order: 20 });
registerMainMenuItem({ label: "⚙️ Admin", data: "admin:panel", order: 90 });

const composer = new Composer<Ctx>();

const WELCOME = "👋 Welcome to Virtual Numbers!\n\nGet a one-time virtual phone number for verification, privacy, or testing. Tap a button below to get started.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
