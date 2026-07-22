import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getNumber, getCountry, markNumberSold, createOrder, updateOrder, nextOrderId, createListing, now } from "../storage.js";
import { processPayment } from "../payment.js";

const composer = new Composer<Ctx>();

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

composer.callbackQuery(/^purchase:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const numberId = ctx.match![1];
  const num = getNumber(numberId);
  if (!num || num.status !== "available") {
    await ctx.editMessageText("Sorry, that number was just taken. Pick another one.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Browse numbers", "browse:countries")]]),
    });
    return;
  }

  await ctx.editMessageText("⏳ Processing payment…");

  const orderId = nextOrderId();
  const order = {
    id: orderId,
    buyerId: ctx.from!.id,
    buyerName: ctx.from!.first_name ?? "User",
    numberId: num.id,
    countryCode: num.countryCode,
    number: num.number,
    sku: num.sku,
    price: num.price,
    currency: num.currency,
    paymentStatus: "pending" as const,
    createdAt: now().toISOString(),
  };
  createOrder(order);

  const result = await processPayment(num.price, num.currency, `Virtual Number ${num.sku}`);

  if (!result.success) {
    updateOrder(orderId, { paymentStatus: "failed" });
    await ctx.reply(`Payment couldn't be processed: ${result.error ?? "Unknown error"}\n\nPlease try again later.`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  markNumberSold(num.id, ctx.from!.id);
  updateOrder(orderId, { paymentStatus: "completed" });

  ctx.session.step = undefined;
  ctx.session.purchaseCountry = undefined;
  ctx.session.purchaseSku = undefined;
  ctx.session.purchaseNumberId = undefined;

  const country = getCountry(num.countryCode);

  await ctx.reply(
    `✅ Purchase complete!\n\n` +
    `${getCountryFlag(num.countryCode)} ${num.number}\n` +
    `Country: ${country?.name ?? num.countryCode}\n` +
    `Order: ${orderId}\n` +
    `Paid: ${num.currency} ${num.price.toFixed(2)}\n\n` +
    `Use this number for your verification. It's a one-time number and won't work again after the code is received.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("📢 List publicly", `listing:optin:${orderId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );

  if (ADMIN_CHAT_ID) {
    try {
      await ctx.api.sendMessage(
        ADMIN_CHAT_ID,
        `💰 New sale!\n\nOrder: ${orderId}\nBuyer: ${ctx.from!.first_name} (${ctx.from!.id})\nNumber: ${num.number}\nCountry: ${country?.name ?? num.countryCode}\nAmount: ${num.currency} ${num.price.toFixed(2)}`,
      );
    } catch {
      // Admin channel may not be accessible — non-fatal
    }
  }
});

function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", CA: "🇨🇦", DE: "🇩🇪", FR: "🇫🇷",
    AU: "🇦🇺", JP: "🇯🇵", BR: "🇧🇷", IN: "🇮🇳", CN: "🇨🇳",
  };
  return flags[code] ?? "🏳️";
}

export default composer;
