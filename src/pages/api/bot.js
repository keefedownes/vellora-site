import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper to fetch activation row
const getUserRow = async (id) => {
  const { data, error } = await supabase
    .from("activations")
    .select("*")
    .eq("telegram_id", id)
    .single();
  return { data, error };
};

bot.command("start", async (ctx) => {
  const userId = ctx.from.id;

  // Reset or create new record
  await supabase
    .from("activations")
    .upsert({ telegram_id: userId, step: 0, status: "pending" }, { onConflict: ["telegram_id"] });

  await ctx.reply("Welcome to Vellora. Please enter your activation code.");
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text.trim();
  const { data: row, error } = await getUserRow(userId);

  if (error || !row) return ctx.reply("Please type /start first.");

  const step = row.step;

  try {
    if (step === 0) {
      const { data: codeRow } = await supabase
        .from("activations")
        .select("*")
        .eq("code", text.toLowerCase())
        .eq("status", "pending")
        .single();

      if (!codeRow) return ctx.reply("Invalid or already used activation code.");

      await supabase
        .from("activations")
        .update({ code: text.toLowerCase(), step: 1 })
        .eq("telegram_id", userId);

      return ctx.reply("Activation code accepted. What is your full name?");
    }

    if (step === 1) {
      await supabase.from("activations").update({ name: text, step: 2 }).eq("telegram_id", userId);
      return ctx.reply("What is your Instagram handle?");
    }

    if (step === 2) {
      const handle = text.replace(/@/, "");
      await supabase.from("activations").update({ handle, step: 3 }).eq("telegram_id", userId);
      return ctx.reply("Please enter your Instagram password (this message will be deleted).");
    }

    if (step === 3) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.msg.message_id);
      const hash = await bcrypt.hash(text, 10);
      await supabase.from("activations").update({ password_hash: hash, step: 4 }).eq("telegram_id", userId);
      return ctx.reply("How would you like to target? Type 'hashtags' or 'accounts'.");
    }

    if (step === 4) {
      if (text.toLowerCase().includes("hash")) {
        await supabase.from("activations").update({
          targeting: JSON.stringify({ type: "hashtags", list: [] }),
          step: 5,
        }).eq("telegram_id", userId);
        return ctx.reply("List up to 5 hashtags separated by commas.");
      } else if (text.toLowerCase().includes("account")) {
        await supabase.from("activations").update({
          targeting: JSON.stringify({ type: "accounts", list: [] }),
          step: 5,
        }).eq("telegram_id", userId);
        return ctx.reply("List up to 5 account usernames separated by commas.");
      } else {
        return ctx.reply("Please type either 'hashtags' or 'accounts'.");
      }
    }

    if (step === 5) {
      const cleanedList = text.split(",").map((s) => s.trim().replace("@", "")).slice(0, 5);
      const targeting = { ...JSON.parse(row.targeting), list: cleanedList };

      await supabase.from("activations").update({ targeting: JSON.stringify(targeting), step: 6 }).eq("telegram_id", userId);
      return ctx.reply("Would you like to unfollow accounts that don’t follow you back? (yes/no)");
    }

    if (step === 6) {
      const unfollow = text.toLowerCase().startsWith("y");
      await supabase.from("activations").update({ unfollow, step: 7 }).eq("telegram_id", userId);
      return ctx.reply("What working hours should we manage your account? (e.g. 09:00-17:00)");
    }

    if (step === 7) {
      await supabase.from("activations").update({
        work_hours: text,
        step: 8,
        status: "used",
        tier: "bloom",
        created_at: new Date().toISOString(),
      }).eq("telegram_id", userId);

      return ctx.reply("Your setup is now complete. Welcome to Vellora.");
    }

    return ctx.reply("You’ve already completed setup. Type /start to reset.");
  } catch (err) {
    console.error("Bot flow error:", err);
    return ctx.reply("An error occurred. Please try again.");
  }
});

export default async function handler(req, res) {
  try {
    await bot.init();
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error("Webhook error:", err);
  }
  res.status(200).end();
}
