import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP = (
  "ℹ️ How Virtual Numbers works\n\n" +
  "• Tap 🌍 Browse to pick a country and number\n" +
  "• Pay once — the number is yours for a single verification\n" +
  "• You'll receive the number right here in chat\n" +
  "• Optionally list it publicly for others to see\n\n" +
  "Refund policy\n" +
  "If a number doesn't work for your verification, contact @support within 24 hours for a full refund.\n\n" +
  "Need help? Tap /start to go back to the menu."
);

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
