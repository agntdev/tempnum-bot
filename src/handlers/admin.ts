import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getAllCountries, setCountry, getCountry, getUserOrders } from "../storage.js";

const composer = new Composer<Ctx>();

const ADMIN_IDS = (process.env.ADMIN_IDS ?? "").split(",").filter(Boolean).map(Number);

function isAdmin(userId: number): boolean {
  if (ADMIN_IDS.length === 0) return false;
  return ADMIN_IDS.includes(userId);
}

composer.callbackQuery("admin:panel", async (ctx) => {
  if (!isAdmin(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  await ctx.answerCallbackQuery();
  const countries = getAllCountries();
  const lines = countries.map((c) =>
    `${c.enabled ? "✅" : "❌"} ${c.name} (${c.code}) — ${c.currency} ${c.basePrice.toFixed(2)}`,
  );

  await ctx.editMessageText(
    `⚙️ Admin Panel\n\nCountries:\n${lines.join("\n")}`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton("Toggle country", "admin:toggle")],
        [inlineButton("Set pricing", "admin:price")],
        [inlineButton("⬅️ Back to menu", "menu:main")],
      ]),
    },
  );
});

composer.callbackQuery("admin:toggle", async (ctx) => {
  if (!isAdmin(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  await ctx.answerCallbackQuery();
  const countries = getAllCountries();
  const rows = countries.map((c) => [
    inlineButton(
      `${c.enabled ? "✅" : "❌"} ${c.name}`,
      `admin:toggle:${c.code}`,
    ),
  ]);
  rows.push([inlineButton("⬅️ Back", "admin:panel")]);

  await ctx.editMessageText("Tap a country to toggle its availability:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^admin:toggle:(.+)$/, async (ctx) => {
  if (!isAdmin(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  await ctx.answerCallbackQuery();
  const code = ctx.match![1];
  const country = getCountry(code);
  if (!country) return;

  setCountry({ ...country, enabled: !country.enabled });
  const updated = getCountry(code);

  await ctx.editMessageText(
    `${country.name} is now ${updated?.enabled ? "enabled ✅" : "disabled ❌"}`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:toggle")]]),
    },
  );
});

composer.callbackQuery("admin:price", async (ctx) => {
  if (!isAdmin(ctx.from!.id)) {
    await ctx.answerCallbackQuery({ text: "Not authorized" });
    return;
  }
  await ctx.answerCallbackQuery();
  const countries = getAllCountries();
  const lines = countries.map((c) =>
    `${c.name}: ${c.currency} ${c.basePrice.toFixed(2)}`,
  );

  await ctx.editMessageText(
    `Current pricing:\n\n${lines.join("\n")}\n\nTo change pricing, contact the developer.`,
    {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back", "admin:panel")]]),
    },
  );
});

export default composer;
