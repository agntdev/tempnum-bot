import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserOrders, getCountry, getListing } from "../storage.js";

const composer = new Composer<Ctx>();

const composer2 = new Composer<Ctx>();

composer2.callbackQuery("orders:history", async (ctx) => {
  await ctx.answerCallbackQuery();
  const orders = getUserOrders(ctx.from!.id);

  if (orders.length === 0) {
    await ctx.editMessageText("You haven't purchased any numbers yet.\n\nTap 🌍 Browse Numbers to find one.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const lines = orders.map((o) => {
    const country = getCountry(o.countryCode);
    const listing = getListing(o.id);
    const status = o.paymentStatus === "completed" ? "✅ Active" : o.paymentStatus === "refunded" ? "↩️ Refunded" : "⏳ Pending";
    const listStatus = listing ? (listing.visible ? "📢 Public" : "🔒 Private") : "—";
    return `${getCountryFlag(o.countryCode)} ${o.number}\nOrder: ${o.id} · ${country?.name ?? o.countryCode}\n${status} · ${listStatus}`;
  });

  await ctx.editMessageText(`Your numbers (${orders.length}):\n\n${lines.join("\n\n")}`, {
    reply_markup: inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", CA: "🇨🇦", DE: "🇩🇪", FR: "🇫🇷",
    AU: "🇦🇺", JP: "🇯🇵", BR: "🇧🇷", IN: "🇮🇳", CN: "🇨🇳",
  };
  return flags[code] ?? "🏳️";
}

export default composer2;
