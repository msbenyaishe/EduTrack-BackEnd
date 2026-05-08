const https = require('https');
const pool = require('../config/db');
require('dotenv').config();

/**
 * Helper to escape HTML special characters for Telegram HTML mode
 */
const escapeHTML = (str) => {
  if (!str) return "";
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

/**
 * Generic internal send message helper using direct HTTPS request
 */
const sendMessage = async (chatId, message) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your_telegram_bot_token_here') {
    console.log("❌ Telegram bot token not configured. Skipping notification.");
    return;
  }
  
  if (!chatId) {
    console.log("⚠️ No Chat ID provided. Skipping notification.");
    return;
  }

  // Sanitize chatId: trim and remove potential accidental quotes
  const cleanChatId = String(chatId).trim().replace(/['"]/g, '');

  const data = JSON.stringify({
    chat_id: cleanChatId,
    text: message,
    parse_mode: 'HTML'
  });

  const options = {
    hostname: 'api.telegram.org',
    port: 443,
    path: `/bot${token}/sendMessage`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    },
    timeout: 8000
  };

  return new Promise((resolve) => {
    console.log(`📨 Attempting to send Telegram message to ${cleanChatId}...`);
    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ Telegram notification sent successfully to chat ID: ${cleanChatId}`);
        } else {
          console.error(`❌ Telegram API error (${res.statusCode}) for ${cleanChatId}:`, responseBody);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error(`❌ Telegram Notification Request Error for ${cleanChatId}:`, error.message);
      resolve();
    });

    req.on('timeout', () => {
      req.destroy();
      console.error(`❌ Telegram Notification Timeout for ${cleanChatId}`);
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
    if (rows.length > 0 && rows[0].telegram_chat_id) {
      await sendMessage(rows[0].telegram_chat_id, message);
    }
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
  const message = "<b>NEW WORKSHOP PUBLISHED</b>\n\n" +
                  `<b>Module:</b> ${escapeHTML(moduleName)}\n` +
                  `<b>Workshop:</b> ${escapeHTML(title)}\n` +
                  (deadline ? `<b>Deadline:</b> ${escapeHTML(deadline)}\n` : "") +
                  "\nAccess the EduTrack platform for further details.";
  
  await sendToGroup(groupId, message);
};

/**
 * Specialized: Notify group about a new agile sprint
 */
const notifyNewSprint = async (groupId, details) => {
  const { moduleName, title } = details;
  const message = "<b>NEW AGILE SPRINT CREATED</b>\n\n" +
                  `<b>Module:</b> ${escapeHTML(moduleName)}\n` +
                  `<b>Sprint:</b> ${escapeHTML(title)}\n\n` +
                  "Log in to the EduTrack platform to begin your tasks.";

  await sendToGroup(groupId, message);
};

/**
 * Specialized: Notify group about a new module
 */
const notifyNewModule = async (groupId, details) => {
  const { title, description } = details;
  const message = "<b>NEW MODULE ASSIGNED</b>\n\n" +
                  `<b>Module:</b> ${escapeHTML(title)}\n` +
                  (description ? `<b>Description:</b> ${escapeHTML(description)}\n` : "") +
                  "\nAccess the EduTrack platform for further details.";

  await sendToGroup(groupId, message);
};

/**
 * Specialized: Notify teacher about a student submission
 */
const sendSubmissionNotification = async (teacherChatId, submissionDetails) => {
  const { studentName, moduleName, assignmentTitle, groupName, submittedAt, optionalMessage } = submissionDetails;

  const message = "<b>NEW STUDENT SUBMISSION RECEIVED</b>\n\n" +
                  `<b>Student:</b> ${escapeHTML(studentName)}\n` +
                  `<b>Module:</b> ${escapeHTML(moduleName)}\n` +
                  `<b>Assignment:</b> ${escapeHTML(assignmentTitle)}\n` +
                  (groupName ? `<b>Group:</b> ${escapeHTML(groupName)}\n` : "") +
                  `<b>Date:</b> ${escapeHTML(submittedAt)}\n` +
                  (optionalMessage ? `<b>Note:</b> ${escapeHTML(optionalMessage)}\n` : "") +
                  "\nPlease review this submission on the Teacher Dashboard.";

  if (teacherChatId) {
    await sendMessage(teacherChatId, message);
  } else {
    console.log("⚠️ No teacherChatId provided for submission notification. Skipping.");
  }
};

module.exports = {
  sendToGroup,
  sendToTeacher,
  sendToStudent,
  sendBroadcast,
  notifyNewWorkshop,
  notifyNewSprint,
  notifyNewModule,
  sendSubmissionNotification
};

