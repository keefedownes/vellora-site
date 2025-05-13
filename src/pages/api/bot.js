import { Bot } from "grammy";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Bot(process.env.BOT_TOKEN);
const sessions = new Map();

let botInitialized = false;
const initBot = async () => {
  if (!botInitialized) {
    await bot.init();
    botInitialized = true;
  }
};

bot.command("start", async (ctx) => {
  const chatId = ctx.chat.id;
  sessions.set(chatId, { step: 1, data: { chat_id: chatId, status: "pending" } });

  const { data: existing } = await supabase
    .from("activations")
    .select("*")
    .eq("chat_id", chatId)
    .maybeSingle();

  if (existing) {
    await supabase.from("activations").update({ step: 1, status: "pending" }).eq("chat_id", chatId);
  } else {
    await supabase.from("activations").insert([{ chat_id: chatId, step: 1, status: "pending" }]);
  }

  await ctx.reply("Welcome to Vellora. Please enter your activation code to begin.");
});

bot.on("message:text", async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text.trim();
  const session = sessions.get(chatId);

  if (!session) return ctx.reply("Please type /start first to begin setup.");
  const step = session.step;
  const data = session.data;

  try {
    switch (step) {
      case 1: {
        const code = text.toUpperCase();
        const { data: row, error } = await supabase
          .from("activations")
          .select("*")
          .eq("code", code)
          .eq("status", "unused")
          .maybeSingle();

        if (error || !row) {
          return ctx.reply("❌ That code is invalid or already used. Please check and try again.");
        }

        data.code = code;
        data.plan = row.plan;
        session.step = 2;
        await ctx.reply("✅ Code accepted. What is your full name?");
        break;
      }

      case 2: {
        if (text.length < 3 || !/^[a-zA-Z\s.'-]+$/.test(text)) {
          return ctx.reply("❌ That doesn't look like a valid name. Please enter your full name.");
        }

        data.name = text;
        session.step = 3;
        await ctx.reply("What is your Instagram handle?");
        break;
      }

      case 3: {
        const handle = text.replace("@", "").trim();
        if (!/^[a-zA-Z0-9._]{3,30}$/.test(handle)) {
          return ctx.reply("❌ That doesn't look like a valid Instagram username. Try again.");
        }

        data.handle = handle;
        session.step = 4;
        await ctx.reply("Please enter your Instagram password. This message will be deleted after processing.");
        break;
      }

      case 4: {
        await ctx.api.deleteMessage(chatId, ctx.msg.message_id);
        data.password_hash = await bcrypt.hash(text, 10);
        session.step = 5;
        await ctx.reply("How would you like to target engagement? Type 'hashtags' or 'accounts'.");
        break;
      }

      case 5: {
        const lowered = text.toLowerCase();
        if (lowered.includes("hash")) {
          data.targeting = { type: "hashtags", list: [] };
        } else if (lowered.includes("account")) {
          data.targeting = { type: "accounts", list: [] };
        } else {
          return ctx.reply("❌ Please reply with either 'hashtags' or 'accounts'.");
        }

        session.step = 6;
        await ctx.reply(`List up to 5 ${data.targeting.type}, separated by commas.`);
        break;
      }

      case 6: {
        const list = text
          .split(",")
          .map(s => s.trim().replace("@", ""))
          .filter(s => s.length > 1)
          .slice(0, 5);

        if (list.length === 0) {
          return ctx.reply("❌ Please enter at least one valid target.");
        }

        data.targeting.list = list;
        session.step = 7;
        await ctx.reply("Would you like to unfollow accounts that don’t follow you back? (yes/no)");
        break;
      }

      case 7: {
        const val = text.toLowerCase();
        if (!["yes", "no", "y", "n"].includes(val)) {
          return ctx.reply("❌ Please respond with 'yes' or 'no'.");
        }

        data.unfollow = val.startsWith("y");
        session.step = 8;
        await ctx.reply("What hours should we manage your account? (e.g. 09:00–17:00)");
        break;
      }

      case 8: {
        const isValidRange = /^([0-1]\d|2[0-3]):([0-5]\d)-([0-1]\d|2[0-3]):([0-5]\d)$/.test(text);
        if (!isValidRange) {
          return ctx.reply("❌ Please use 24h format like 09:00-17:00.");
        }

        data.work_hours = text;
        data.status = "used";
        data.created_at = new Date().toISOString();
        session.step = 9;

        await ctx.reply("✅ Setup complete. You are now onboarded.");
        break;
      }

      default:
        return ctx.reply("You've already completed setup. Type /start to restart.");
    }

    // Save to Supabase
    console.log("Saving to Supabase:", { ...data, step: session.step });
    const { error } = await supabase
      .from("activations")
      .upsert({ ...data, step: session.step }, { onConflict: ["chat_id"] });

    if (error) console.error("Supabase update error:", error);
  } catch (err) {
    console.error("Bot error:", err);
    await ctx.reply("⚠️ Something went wrong. Type /start to begin again.");
    sessions.delete(chatId);
  }
});

// Webhook entry for Vercel
export default async function handler(req, res) {
  try {
    await initBot();
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error("Webhook error:", err);
  }
  res.status(200).end();
}
