const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const telegramService = require('../services/telegramService');

async function testGroupNotif() {
  const groupId = 9; // Based on my DB check
  const details = {
    moduleName: "Test Module",
    title: "Test Workshop",
    deadline: "2024-05-14"
  };
  
  console.log("Attempting to send test notification to group ID:", groupId);
  await telegramService.notifyNewWorkshop(groupId, details);
  console.log("Test notification process finished.");
  process.exit(0);
}

testGroupNotif();
