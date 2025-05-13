import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Bot(process.env.BOT_TOKEN);

let botInitialized = false;
const initBot = async () => {
  if (!botInitialized) {
    await bot.init();
    botInitialized = true;
  }
};

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;

  const { data: existing, error } = await supabase
    .from("activations")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (error) {
    console.error("Supabase error during /start:", error);
    return ctx.reply("Something went wrong. Please try again later.");
  }

  if (!existing) {
    await supabase.from("activations").insert([
      { chat_id: chatId, step: 1, status: "pending" }
    ]);
  } else {
    await supabase.from("activations")
      .update({ step: 1 })
      .eq("chat_id", chatId);
  }

  return ctx.reply("Welcome to the Vellora onboarding process. Please enter your activation code to begin.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  const { data: row } = await supabase
    .from("activations")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (!row) return ctx.reply("Please type /start first.");
  const step = row.step || 1;

  try {
    if (step === 1) {
      const { data: activation, error } = await supabase
        .from("activations")
        .select("*")
        .eq("code", text.toLowerCase())
        .eq("status", "pending")
        .maybeSingle();

      if (!activation || error) return ctx.reply("Invalid or already used activation code.");

      await supabase.from("activations").update({
        code: text.toLowerCase(),
        step: 2
      }).eq("chat_id", chatId);

      return ctx.reply("Activation code accepted. What is your full name?");
    }

    if (step === 2) {
      await supabase.from("activations").update({
        name: text,
        step: 3
      }).eq("chat_id", chatId);

      return ctx.reply("What is your Instagram handle?");
    }

    if (step === 3) {
      await supabase.from("activations").update({
        handle: text.replace("@", ""),
        step: 4
      }).eq("chat_id", chatId);

      return ctx.reply("Please enter your Instagram password. This message will be deleted after processing.");
    }

    if (step === 4) {
      await ctx.api.deleteMessage(chatId, ctx.msg.message_id);
      const hash = await bcrypt.hash(text, 10);

      await supabase.from("activations").update({
        password_hash: hash,
        step: 5
      }).eq("chat_id", chatId);

      return ctx.reply("How would you like to target your engagement? Type 'hashtags' or 'accounts'.");
    }

    if (step === 5) {
      let targeting = null;
      if (text.toLowerCase().includes("hash")) {
        targeting = { type: "hashtags", list: [] };
      } else if (text.toLowerCase().includes("account")) {
        targeting = { type: "accounts", list: [] };
      }

      if (!targeting) return ctx.reply("Please type 'hashtags' or 'accounts'.");

      await supabase.from("activations").update({
        targeting,
        step: 6
      }).eq("chat_id", chatId);

      return ctx.reply(`List up to 5 ${targeting.type}, separated by commas.`);
    }

    if (step === 6) {
      const list = text.split(",").map((s) => s.trim().replace("@", "")).slice(0, 5);

      await supabase.from("activations").update({
        targeting: { ...row.targeting, list },
        step: 7
      }).eq("chat_id", chatId);

      return ctx.reply("Would you like to unfollow accounts that don’t follow you back? (yes/no)");
    }

    if (step === 7) {
      const unfollow = text.toLowerCase().startsWith("y");

      await supabase.from("activations").update({
        unfollow,
        step: 8
      }).eq("chat_id", chatId);

      return ctx.reply("What working hours should we manage your account? (e.g. 09:00-17:00)");
    }

    if (step === 8) {
      await supabase.from("activations").update({
        work_hours: text,
        status: "used",
        tier: "bloom",
        step: 9,
        created_at: new Date().toISOString()
      }).eq("chat_id", chatId);

      return ctx.reply("Setup complete. Thank you for joining Vellora.");
    }
  } catch (err) {
    console.error("Step error:", err);
    return ctx.reply("An unexpected error occurred. Please try again.");
  }
});

// Webhook handler for Vercel
export default async function handler(req, res) {
  try {
    await initBot();
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error("Webhook error:", err);
  }
  res.status(200).end();
}
