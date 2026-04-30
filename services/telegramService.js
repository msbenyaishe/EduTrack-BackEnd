const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const defaultChatId = process.env.DEFAULT_TEACHER_CHAT_ID;
let bot = null;

if (token && token !== 'your_telegram_bot_token_here') {
  bot = new TelegramBot(token, { polling: false });
}

const sendSubmissionNotification = async (teacherChatId, submissionDetails) => {
  if (!bot) {
    console.log("Telegram bot not configured or token is placeholder. Skipping notification.");
    return;
  }

  const targetChatId = teacherChatId || defaultChatId;

  if (!targetChatId || targetChatId === 'teacher_chat_id_here') {
    console.log("No teacher Chat ID found and no valid default configured. Skipping Telegram notification.");
    return;
  }

  const { studentName, moduleName, assignmentTitle, groupName, submittedAt, optionalMessage } = submissionDetails;

  const message = `📢 *New Student Submission*

👨‍🎓 *Student:* ${studentName}
📘 *Module:* ${moduleName}
📂 *Assignment:* ${assignmentTitle}
${groupName ? `👥 *Group:* ${groupName}` : ''}
🕒 *Submitted at:* ${submittedAt}
${optionalMessage ? `📝 *Message:* ${optionalMessage}` : ''}

Please check the teacher dashboard.`;

  try {
    await bot.sendMessage(targetChatId, message, { parse_mode: 'Markdown' });
    console.log(`Telegram notification sent successfully to chat ID: ${targetChatId}`);
  } catch (error) {
    console.error("Telegram Notification Error:", error.message);
    // Suppress error to avoid failing the submission
  }
};

module.exports = {
  sendSubmissionNotification
};
