import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getOrder, createListing, getListing, updateListing } from "../storage.js";

const composer = new Composer<Ctx>();

const LISTING_CHANNEL = process.env.LISTING_CHANNEL;

composer.callbackQuery(/^listing:optin:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match![1];
  const order = getOrder(orderId);

  if (!order || order.buyerId !== ctx.from!.id) {
    await ctx.editMessageText("Order not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const existing = getListing(orderId);
  if (existing?.visible) {
    await ctx.editMessageText("This number is already listed publicly.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const anonymized = `User${String(ctx.from!.id).slice(-4)}`;
  createListing({
    orderId,
    countryCode: order.countryCode,
    number: order.number,
    sku: order.sku,
    anonymizedHandle: anonymized,
    visible: true,
    createdAt: new Date().toISOString(),
  });

  await ctx.editMessageText(
    `📢 Your number is now listed publicly!\n\n` +
    `Display name: ${anonymized}\n` +
    `Country: ${order.countryCode}\n\n` +
    `Others can see this number in the public listings channel.`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("🔒 Remove from public", `listing:optout:${orderId}`)],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );

  if (LISTING_CHANNEL) {
    try {
      await ctx.api.sendMessage(
        LISTING_CHANNEL,
        `📢 New virtual number available!\n\n` +
        `${order.number}\n` +
        `Country: ${order.countryCode}\n` +
        `Listed by: ${anonymized}`,
      );
    } catch {
      // Channel may not be accessible — non-fatal
    }
  }
});

composer.callbackQuery(/^listing:optout:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const orderId = ctx.match![1];
  const order = getOrder(orderId);

  if (!order || order.buyerId !== ctx.from!.id) {
    await ctx.editMessageText("Order not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  updateListing(orderId, { visible: false });

  await ctx.editMessageText("Your number has been removed from public listings.", {
    reply_markup: inlineKeyboard([
      [inlineButton("📢 Re-list publicly", `listing:optin:${orderId}`)],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]),
  });
});

export default composer;
