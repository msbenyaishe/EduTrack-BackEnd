const TelegramBot = require('node-telegram-bot-api');
const pool = require('../config/db');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const defaultChatId = process.env.DEFAULT_TEACHER_CHAT_ID;
let bot = null;

if (token && token !== 'your_telegram_bot_token_here') {
  bot = new TelegramBot(token, { polling: false });
}

/**
 * Generic internal send message helper
 */
const sendMessage = async (chatId, message) => {
  if (!bot) {
    console.log("Telegram bot not configured. Skipping notification.");
    return;
  }
  if (!chatId || chatId === 'teacher_chat_id_here') {
    console.log("No valid Chat ID provided. Skipping notification.");
    return;
  }
  try {
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    console.log(`Telegram notification sent successfully to chat ID: ${chatId}`);
  } catch (error) {
    console.error("Telegram Notification Error:", error.message);
  }
};

/**
 * Send notification to a specific educational group
 */
const sendToGroup = async (groupId, message) => {
  try {
    const [rows] = await pool.query("SELECT telegram_chat_id FROM groups WHERE id = ?", [groupId]);
    if (rows.length > 0 && rows[0].telegram_chat_id) {
      await sendMessage(rows[0].telegram_chat_id, message);
    } else {
      console.log(`No Telegram Chat ID configured for group ID ${groupId}`);
    }
  } catch (err) {
    console.error("Failed to sendToGroup:", err.message);
  }
};

/**
 * Send notification to a specific teacher
 */
const sendToTeacher = async (teacherId, message) => {
  try {
    const [rows] = await pool.query("SELECT telegram_chat_id FROM teachers WHERE id = ?", [teacherId]);
    const chatId = (rows.length > 0 && rows[0].telegram_chat_id) ? rows[0].telegram_chat_id : defaultChatId;
    await sendMessage(chatId, message);
  } catch (err) {
    console.error("Failed to sendToTeacher:", err.message);
  }
};

/**
 * Send notification to a specific student
 */
const sendToStudent = async (studentId, message) => {
  try {
    const [rows] = await pool.query("SELECT telegram_chat_id FROM students WHERE id = ?", [studentId]);
    if (rows.length > 0 && rows[0].telegram_chat_id) {
      await sendMessage(rows[0].telegram_chat_id, message);
    }
  } catch (err) {
    console.error("Failed to sendToStudent:", err.message);
  }
};

/**
 * Broadcast message to all registered educational groups
 */
const sendBroadcast = async (message) => {
  try {
    const [rows] = await pool.query("SELECT telegram_chat_id FROM groups WHERE telegram_chat_id IS NOT NULL");
    for (const row of rows) {
      await sendMessage(row.telegram_chat_id, message);
    }
  } catch (err) {
    console.error("Failed to sendBroadcast:", err.message);
  }
};

/**
 * Specialized: Notify group about a new workshop (Atelier)
 */
const notifyNewWorkshop = async (groupId, details) => {
  const { moduleName, title, deadline } = details;
  const message = `📢 *New Atelier Published*
📘 *Module:* ${moduleName}
📌 *Atelier:* ${title}
${deadline ? `📅 *Deadline:* ${deadline}` : ''}

Please check the platform for details.`;
  
  await sendToGroup(groupId, message);
};

/**
 * Specialized: Notify group about a new agile sprint
 */
const notifyNewSprint = async (groupId, details) => {
  const { moduleName, title } = details;
  const message = `📢 *New Agile Sprint Created*
📘 *Module:* ${moduleName}
🏃 *Sprint:* ${title}

Please check the platform to start your tasks.`;

  await sendToGroup(groupId, message);
};

/**
 * Specialized: Notify teacher about a student submission
 */
const sendSubmissionNotification = async (teacherChatId, submissionDetails) => {
  const { studentName, moduleName, assignmentTitle, groupName, submittedAt, optionalMessage } = submissionDetails;

  const message = `📢 *New Student Submission*

👨‍🎓 *Student:* ${studentName}
📘 *Module:* ${moduleName}
📂 *Assignment:* ${assignmentTitle}
${groupName ? `👥 *Group:* ${groupName}` : ''}
🕒 *Submitted at:* ${submittedAt}
${optionalMessage ? `📝 *Message:* ${optionalMessage}` : ''}

Please check the teacher dashboard.`;

  await sendMessage(teacherChatId || defaultChatId, message);
};

module.exports = {
  sendToGroup,
  sendToTeacher,
  sendToStudent,
  sendBroadcast,
  notifyNewWorkshop,
  notifyNewSprint,
  sendSubmissionNotification
};
