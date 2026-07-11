const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const settings = await prisma.legalSettings.findFirst();
  const apiKey = settings.aiApiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hello, this is a test. Answer with 'ok'." }] }]
    })
  });
  
  console.log('Status:', response.status);
  console.log('Body:', await response.text());
}
run();
