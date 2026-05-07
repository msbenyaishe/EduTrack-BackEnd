const https = require('https');

const token = '8685929580:AAF6CDnqAqsiL6Vv2-TZSgivAdgXSPTAqfQ';
const chatId = '-5238262434';
const text = 'Test message from diagnostic script';

const data = JSON.stringify({
  chat_id: chatId,
  text: text
});

const options = {
  hostname: 'api.telegram.org',
  port: 443,
  path: `/bot${token}/sendMessage`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = https.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  
  let body = '';
  res.on('data', (d) => {
    body += d;
  });
  
  res.on('end', () => {
    console.log('Response Body:', body);
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.write(data);
req.end();
