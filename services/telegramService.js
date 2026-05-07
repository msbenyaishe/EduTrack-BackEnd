const https = require('https');
const pool = require('../config/db');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const defaultChatId = process.env.DEFAULT_TEACHER_CHAT_ID;

/**
 * Generic internal send message helper using direct HTTPS request
 * for maximum compatibility with serverless environments (Vercel)
 */
const sendMessage = async (chatId, message) => {
  if (!token || token === 'your_telegram_bot_token_here') {
    console.log("❌ Telegram bot token not configured. Skipping notification.");
    return;
  }
  if (!chatId || chatId === 'teacher_chat_id_here') {
    console.log(`⚠️ No valid Chat ID provided (${chatId}). Skipping notification.`);
    return;
  }

  const data = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'Markdown'
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    },
    timeout: 8000 // 8 seconds timeout
  };

  return new Promise((resolve) => {
    console.log(`📨 Attempting to send Telegram message to ${chatId}...`);
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Telegram notification sent successfully to chat ID: ${chatId}`);
        } else {
          console.error(`❌ Telegram API error (${res.statusCode}):`, responseBody);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Telegram Notification Request Error for ${chatId}:`, error.message);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`❌ Telegram Notification Timeout for ${chatId}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
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
