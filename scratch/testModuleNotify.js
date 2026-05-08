const telegramService = require("../services/telegramService");

// Mocking the behavior for testing
async function testModuleNotification() {
    console.log("Starting Module Notification Test...");
    
    const mockDetails = {
        title: "Advanced Web Development",
        description: "A comprehensive course on React, Node.js, and Telegram integrations."
    };
    
    // This will attempt to send to group ID 1.
    // If the database has a chat ID for group 1, it will try to send.
    // If not, it will log "No Telegram Chat ID configured".
    try {
        await telegramService.notifyNewModule(1, mockDetails);
        console.log("Test execution completed.");
    } catch (err) {
        console.error("Test failed:", err.message);
    }
}

testModuleNotification();
