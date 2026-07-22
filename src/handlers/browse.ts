import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getEnabledCountries, getAvailableNumbers, getCountry, seedDemoData, getNumber } from "../storage.js";

seedDemoData();

const composer = new Composer<Ctx>();

const noCountriesText = "No countries available right now. Check back soon!";

composer.command("browse", async (ctx) => {
  const countries = getEnabledCountries();
  if (countries.length === 0) {
    await ctx.reply(noCountriesText, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const rows = countries.map((c) => {
    const nums = getAvailableNumbers(c.code);
    return [inlineButton(`${getCountryFlag(c.code)} ${c.name} (${nums.length})`, `browse:country:${c.code}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.reply("Pick a country to see available numbers:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery("browse:countries", async (ctx) => {
  await ctx.answerCallbackQuery();
  const countries = getEnabledCountries();
  if (countries.length === 0) {
    await ctx.editMessageText(noCountriesText, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }
  const rows = countries.map((c) => {
    const nums = getAvailableNumbers(c.code);
    return [inlineButton(`${getCountryFlag(c.code)} ${c.name} (${nums.length})`, `browse:country:${c.code}`)];
  });
  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);
  await ctx.editMessageText("Pick a country to see available numbers:", {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^browse:country:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const code = ctx.match![1];
  const country = getCountry(code);
  if (!country) {
    await ctx.editMessageText("Country not found.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]),
    });
    return;
  }

  const numbers = getAvailableNumbers(code);
  if (numbers.length === 0) {
    await ctx.editMessageText(`${getCountryFlag(code)} ${country.name}\n\nSorry, no numbers available right now. Try another country or check back later.`, {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to countries", "browse:countries")]]),
    });
    return;
  }

  const rows = numbers.map((n) => [
    inlineButton(`${n.number} — ${n.currency} ${n.price.toFixed(2)}`, `browse:select:${n.id}`),
  ]);
  rows.push([inlineButton("⬅️ Back to countries", "browse:countries")]);

  await ctx.editMessageText(`${getCountryFlag(code)} ${country.name}\n\nChoose a number:`, {
    reply_markup: inlineKeyboard(rows),
  });
});

composer.callbackQuery(/^browse:select:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const numberId = ctx.match![1];
  const num = getNumber(numberId);
  if (!num || num.status !== "available") {
    await ctx.editMessageText("Sorry, that number is no longer available. Pick another one.", {
      reply_markup: inlineKeyboard([[inlineButton("⬅️ Back to countries", "browse:countries")]]),
    });
    return;
  }

  const country = getCountry(num.countryCode);
  ctx.session.step = "confirming_purchase";
  ctx.session.purchaseCountry = num.countryCode;
  ctx.session.purchaseSku = num.sku;
  ctx.session.purchaseNumberId = num.id;

  await ctx.editMessageText(
    `${getCountryFlag(num.countryCode)} ${num.number}\n\n` +
    `Country: ${country?.name ?? num.countryCode}\n` +
    `SKU: ${num.sku}\n` +
    `Price: ${num.currency} ${num.price.toFixed(2)}\n\n` +
    `Confirm purchase?`,
    {
      reply_markup: inlineKeyboard([
        [inlineButton(`✅ Pay ${num.currency} ${num.price.toFixed(2)}`, `purchase:confirm:${num.id}`)],
        [inlineButton("⬅️ Back", `browse:country:${num.countryCode}`)],
      ]),
    },
  );
});

function getCountryFlag(code: string): string {
  const flags: Record<string, string> = {
    US: "🇺🇸", UK: "🇬🇧", CA: "🇨🇦", DE: "🇩🇪", FR: "🇫🇷",
    AU: "🇦🇺", JP: "🇯🇵", BR: "🇧🇷", IN: "🇮🇳", CN: "🇨🇳",
    ES: "🇪🇸", IT: "🇮🇹", MX: "🇲🇽", KR: "🇰🇷", NL: "🇳🇱",
  };
  return flags[code] ?? "🏳️";
}

export default composer;
