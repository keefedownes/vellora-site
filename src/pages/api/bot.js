import { Bot, session } from "grammy";
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const bot = new Bot(process.env.BOT_TOKEN);

// Initialize session structure
function initialSession() {
  return { step: 0, data: {} };
}
bot.use(session({ initial: initialSession }));

// Command: /start
bot.command("start", async (ctx) => {
  try {
    ctx.session = initialSession();
    await ctx.reply("Welcome to the Vellora onboarding process. Please enter your activation code to begin.");
  } catch (err) {
    console.error("Start command error:", err);
  }
});

// Message handler
bot.on("message:text", async (ctx) => {
  const { step, data } = ctx.session;
  const text = ctx.message.text.trim();

  try {
    if (step === 0) {
      const { data: row, error } = await supabase
        .from("activations")
        .select("*")
        .eq("code", text.toLowerCase())
        .eq("status", "pending")
        .single();

      if (error || !row) return ctx.reply("Invalid or already used activation code.");
      ctx.session.data.code = text.toLowerCase();
      ctx.session.step++;
      return ctx.reply("Activation code accepted. What is your full name?");
    }

    if (step === 1) {
      data.name = text;
      ctx.session.step++;
      return ctx.reply("What is your Instagram handle?");
    }

    if (step === 2) {
      data.handle = text.replace(/@/, "");
      ctx.session.step++;
      return ctx.reply("Please enter your Instagram password. This message will be deleted after processing.");
    }

    if (step === 3) {
      await ctx.api.deleteMessage(ctx.chat.id, ctx.msg.message_id);
      data.password_hash = await bcrypt.hash(text, 10);
      ctx.session.step++;
      return ctx.reply("How would you like to target your engagement? Type 'hashtags' or 'accounts'.");
    }

    if (step === 4) {
      if (text.toLowerCase().includes("hash")) {
        data.targeting = { type: "hashtags", list: [] };
        ctx.session.step++;
        return ctx.reply("List up to 5 hashtags, separated by commas.");
      } else if (text.toLowerCase().includes("account")) {
        data.targeting = { type: "accounts", list: [] };
        ctx.session.step++;
        return ctx.reply("List up to 5 account usernames, separated by commas.");
      } else {
        return ctx.reply("Please type 'hashtags' or 'accounts'.");
      }
    }

    if (step === 5) {
      data.targeting.list = text.split(",").map((s) => s.trim().replace("@", "")).slice(0, 5);
      ctx.session.step++;
      return ctx.reply("Would you like to unfollow accounts that don’t follow you back? (yes/no)");
    }

    if (step === 6) {
      data.unfollow = text.toLowerCase().startsWith("y");
      ctx.session.step++;
      return ctx.reply("What working hours should we manage your account? (e.g. 09:00-17:00)");
    }

    if (step === 7) {
      data.work_hours = text;

      const { error: updateError } = await supabase
        .from("activations")
        .update({
          ...data,
          status: "used",
          tier: "bloom",
          created_at: new Date().toISOString(),
        })
        .eq("code", data.code);

      if (updateError) {
        console.error("Supabase update error:", updateError);
        return ctx.reply("There was a problem saving your information. Please try again.");
      }

      ctx.session = initialSession();
      return ctx.reply("Setup complete. Thank you for joining Vellora.");
    }
  } catch (err) {
    console.error("Message error:", err);
    return ctx.reply("An unexpected error occurred. Please try again.");
  }
});

// Vercel webhook API route
export default async function handler(req, res) {
  try {
    if (!bot.botInfo) {
      await bot.init(); // 💡 required for webhook mode
    }
    await bot.handleUpdate(req.body);
  } catch (err) {
    console.error("Webhook error:", err);
  }
  res.status(200).end();
}
