import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Bot(process.env.BOT_TOKEN);

const sessions = new Map(); // key: chat_id, value: { step, data }

let botInitialized = false;
const initBot = async () => {
  if (!botInitialized) {
    await bot.init();
    botInitialized = true;
  }
};

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;

  // Load or create session
  let session = sessions.get(chatId);

  if (!session) {
    const { data: row } = await supabase
      .from("activations")
      .select("*")
      .eq("chat_id", chatId)
      .maybeSingle();

    if (row) {
      session = { step: row.step || 1, data: row };
    } else {
      await supabase.from("activations").insert([{ chat_id: chatId, step: 1, status: "pending" }]);
      session = { step: 1, data: { chat_id: chatId, status: "pending" } };
    }

    sessions.set(chatId, session);
  } else {
    session.step = 1;
  }

  await ctx.reply("Welcome to the Vellora onboarding process. Please enter your activation code to begin.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();

  const session = sessions.get(chatId);
  if (!session) return ctx.reply("Please type /start to begin.");

  const step = session.step;
  const data = session.data;

  try {
    if (step === 1) {
      data.code = text.toLowerCase();
      session.step = 2;
      await ctx.reply("Activation code accepted. What is your full name?");
    } else if (step === 2) {
      data.name = text;
      session.step = 3;
      await ctx.reply("What is your Instagram handle?");
    } else if (step === 3) {
      data.handle = text.replace("@", "");
      session.step = 4;
      await ctx.reply("Please enter your Instagram password. This message will be deleted after processing.");
    } else if (step === 4) {
      await ctx.api.deleteMessage(chatId, ctx.msg.message_id);
      data.password_hash = await bcrypt.hash(text, 10);
      session.step = 5;
      await ctx.reply("How would you like to target your engagement? Type 'hashtags' or 'accounts'.");
    } else if (step === 5) {
      if (text.toLowerCase().includes("hash")) {
        data.targeting = { type: "hashtags", list: [] };
        session.step = 6;
        await ctx.reply("List up to 5 hashtags, separated by commas.");
      } else if (text.toLowerCase().includes("account")) {
        data.targeting = { type: "accounts", list: [] };
        session.step = 6;
        await ctx.reply("List up to 5 account usernames, separated by commas.");
      } else {
        return ctx.reply("Please type 'hashtags' or 'accounts'.");
      }
    } else if (step === 6) {
      data.targeting.list = text.split(",").map((s) => s.trim().replace("@", "")).slice(0, 5);
      session.step = 7;
      await ctx.reply("Would you like to unfollow accounts that don’t follow you back? (yes/no)");
    } else if (step === 7) {
      data.unfollow = text.toLowerCase().startsWith("y");
      session.step = 8;
      await ctx.reply("What working hours should we manage your account? (e.g. 09:00-17:00)");
    } else if (step === 8) {
      data.work_hours = text;
      data.status = "used";
      data.tier = "bloom";
      data.created_at = new Date().toISOString();
      session.step = 9;
      await ctx.reply("Setup complete. Thank you for joining Vellora.");
    }

    // ✅ Update Supabase in the background (not blocking bot)
    await supabase.from("activations")
      .update({ ...data, step: session.step })
      .eq("chat_id", chatId);
  } catch (err) {
    console.error("Error in step", step, err);
    return ctx.reply("An unexpected error occurred. Please try again.");
  }
});

export default async function handler(req, res) {
  try {
    await initBot();
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error("Webhook error:", err);
  }
  res.status(200).end();
}
