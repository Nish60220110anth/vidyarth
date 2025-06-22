const fs = require('fs');
const { exec } = require('child_process');

const env = fs.readFileSync('.env', 'utf-8')
    .split('\n')
    .find(line => line.startsWith('PORT='));

if (env) {
    const port = env.split('=')[1].trim();
    process.env.PORT = port;

    // Start Next.js
    exec('npm start', { env: process.env, stdio: 'inherit' });
} else {
    console.error('PORT not found in .env');
}
