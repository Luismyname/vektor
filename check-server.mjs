const fetch = require('node:fetch');

async function checkServer() {
  try {
    const response = await fetch('http://localhost:5173/');
    console.log('Status:', response.status);
    console.log('StatusText:', response.statusText);
    const text = await response.text();
    console.log('Body length:', text.length);
    console.log('First 500 chars:', text.substring(0, 500));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

checkServer();