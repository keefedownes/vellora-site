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

// Bot logic
bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;

  const { data: existing } = await supabase
    .from("activations")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!existing) {
    await supabase.from("activations").insert([{ chat_id: chatId, step: 1 }]);
  } else {
    await supabase.from("activations").update({ step: 1 }).eq("chat_id", chatId);
  }

  await ctx.reply("Welcome to the Vellora onboarding process. Please enter your activation code to begin.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  const { data: row } = await supabase
    .from("activations")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!row) return ctx.reply("Please type /start first.");
  const step = row.step || 1;

  if (step === 1) {
    const { data: activation, error } = await supabase
      .from("activations")
      .select("*")
      .eq("code", text.toLowerCase())
      .eq("status", "pending")
      .single();

    if (!activation || error) return ctx.reply("Invalid or already used activation code.");

    await supabase.from("activations").update({ code: text.toLowerCase(), step: 2 }).eq("chat_id", chatId);
    return ctx.reply("Activation code accepted. What is your full name?");
  }

  if (step === 2) {
    await supabase.from("activations").update({ name: text, step: 3 }).eq("chat_id", chatId);
    return ctx.reply("What is your Instagram handle?");
  }

  if (step === 3) {
    await supabase.from("activations").update({ handle: text.replace("@", ""), step: 4 }).eq("chat_id", chatId);
    return ctx.reply("Please enter your Instagram password. This message will be deleted after processing.");
  }

  if (step === 4) {
    await ctx.api.deleteMessage(chatId, ctx.msg.message_id);
    const hash = await bcrypt.hash(text, 10);
    await supabase.from("activations").update({ password_hash: hash, step: 5 }).eq("chat_id", chatId);
    return ctx.reply("How would you like to target your engagement? Type 'hashtags' or 'accounts'.");
  }

  if (step === 5) {
    if (text.toLowerCase().includes("hash")) {
      await supabase.from("activations").update({
        targeting: { type: "hashtags", list: [] },
        step: 6,
      }).eq("chat_id", chatId);
      return ctx.reply("List up to 5 hashtags (comma separated).");
    } else if (text.toLowerCase().includes("account")) {
      await supabase.from("activations").update({
        targeting: { type: "accounts", list: [] },
        step: 6,
      }).eq("chat_id", chatId);
      return ctx.reply("List up to 5 account usernames (comma separated).");
    } else {
      return ctx.reply("Please enter either 'hashtags' or 'accounts'.");
    }
  }

  if (step === 6) {
    const targeting = {
      type: row.targeting?.type,
      list: text.split(",").map((t) => t.trim().replace("@", "")).slice(0, 5),
    };
    await supabase.from("activations").update({ targeting, step: 7 }).eq("chat_id", chatId);
    return ctx.reply("Would you like to unfollow users who don’t follow you back? (yes/no)");
  }

  if (step === 7) {
    await supabase.from("activations").update({
      unfollow: text.toLowerCase().startsWith("y"),
      step: 8,
    }).eq("chat_id", chatId);
    return ctx.reply("What working hours should we manage your account? (e.g. 09:00-17:00)");
  }

  if (step === 8) {
    await supabase.from("activations").update({
      work_hours: text,
      status: "used",
      tier: "bloom",
      created_at: new Date().toISOString(),
      step: 9,
    }).eq("chat_id", chatId);

    return ctx.reply("Setup complete. Thank you for joining Vellora.");
  }
});

// Webhook handler for Vercel
export default async function handler(req, res) {
  try {
    await initBot(); // 🔧 this ensures .init() is called before handling update
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error("Webhook error:", err);
  }
  res.status(200).end();
}
