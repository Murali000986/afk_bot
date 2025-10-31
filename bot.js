import mineflayer from "mineflayer";
import { Client, GatewayIntentBits } from "discord.js";
import fs from "fs";

// ✅ Load config
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// ✅ Discord Setup
const discordClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let loggedIn = false;
let mcBot;

// ✅ Minecraft Bot Setup
function createBot() {
  mcBot = mineflayer.createBot({
    host: config.serverHost,
    port: config.serverPort,
    username: config.botUsername,
    version: config.version,
  });

  mcBot.on("login", () => {
    console.log(`✅ Minecraft bot ${config.botUsername} connected to server`);
    setTimeout(() => {
      mcBot.chat(`/login ${config.botPassword}`);
      console.log(`📤 Sent /login ${config.botPassword}`);
    }, 2000);
  });

  mcBot.on("message", (jsonMsg) => {
    const message = jsonMsg.toString().trim();
    if (!message) return;
    console.log(`📩 [Minecraft Chat] ${message}`);

    // Detect successful login
    if (message.toLowerCase().includes("successfully logged")) {
      console.log("✅ Login success detected, waiting 3s...");
      setTimeout(() => {
        loggedIn = true;
        console.log("✅ Bot is now fully active and can send/receive messages.");
      }, 3000);
    }

    // Send MC chat messages to Discord
    const dcChannel = discordClient.channels.cache.get(config.discordChannelId);
    if (dcChannel && !message.toLowerCase().includes("/login")) {
      dcChannel.send(`📩 **[MC]** ${message}`).catch(console.error);
    }
  });

  // Auto reconnect on end/error
  mcBot.on("end", () => {
    console.log("⛔️ Disconnected. Reconnecting in 10s...");
    setTimeout(createBot, 10000);
  });

  mcBot.on("error", (err) => {
    console.error("⚠️ Minecraft bot error:", err);
  });
}

// ✅ Discord bot ready event
discordClient.once("clientReady", () => {
  console.log(`✅ Connected to Discord as ${discordClient.user.tag}`);
  createBot();
});

// ✅ Discord message → Minecraft
discordClient.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  // Custom command to accept teleport request
  if (msg.content.trim() === "/tpaccept") {
    if (loggedIn && mcBot) {
      mcBot.chat("/tpaccept");
      msg.reply("✅ Sent `/tpaccept` in Minecraft!");
    } else {
      msg.reply("⚠️ Bot not logged in yet — please wait a few seconds.");
    }
    return;
  }

  // Normal chat relay
  if (loggedIn && mcBot) {
    mcBot.chat(`[${msg.author.username}] ${msg.content}`);
  } else {
    msg.reply("⚠️ Bot not logged in yet — skipping message.");
  }
});

// ✅ Start Discord bot
discordClient.login(config.discordToken);
