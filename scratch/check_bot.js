const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

async function checkBot() {
  try {
    const me = await bot.getMe();
    console.log("Bot Info:", me);
    process.exit(0);
  } catch (err) {
    console.error("Error getting bot info:", err.message);
    process.exit(1);
  }
}

checkBot();
