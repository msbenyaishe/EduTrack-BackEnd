require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const telegramService = require('../services/telegramService');

async function test() {
  console.log("Token:", process.env.TELEGRAM_BOT_TOKEN);
  console.log("Chat ID:", process.env.DEFAULT_TEACHER_CHAT_ID);
  
  await telegramService.sendSubmissionNotification(process.env.DEFAULT_TEACHER_CHAT_ID, {
    studentName: "Test Student",
    moduleName: "Test Module",
    assignmentTitle: "Test Assignment",
    groupName: "Test Group",
    submittedAt: new Date().toLocaleString()
  });
  
  console.log("Test finished.");
}

test();
