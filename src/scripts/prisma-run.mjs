import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

const env = process.env.NODE_ENV ?? 'development';
const map = {
    development: '.env.development',
    production: '.env.production',
    test: '.env.test',
};
const envFile = map[env] ?? '.env.development';

dotenv.config({ path: envFile });

if (!process.env.DATABASE_URL) {
    console.error(`DATABASE_URL missing. NODE_ENV=${env} (tried ${envFile})`);
    process.exit(1);
}

const args = process.argv.slice(2);
const child = spawn('npx', ['prisma', ...args], {
    stdio: 'inherit',
    shell: process.platform === 'win32'
});

child.on('exit', code => process.exit(code ?? 0));
