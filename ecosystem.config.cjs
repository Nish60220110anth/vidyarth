require('dotenv').config();

module.exports = {
    apps: [
        {
            name: 'charon',
            cwd: 'C:\\Users\\PC\\Desktop\\Systems\\vidyarth',
            interpreter: process.platform === 'win32' ? 'C:\\Program Files\\nodejs\\node.exe' : 'node',
            script: 'node_modules/next/dist/bin/next',
            args: 'start --port 3000',
            exec_mode: 'cluster',
            instances: 'max',
            watch: false,
            autorestart: true,
            min_uptime: '30s',
            max_restarts: 10,
            listen_timeout: 10000,
            kill_timeout: 8000,
            max_memory_restart: '1G',
            time: true,
            merge_logs: true,
            out_file: 'C:\\Users\\PC\\Desktop\\Systems\\vidyarth\\logs\\charon.out.log',
            error_file: 'C:\\Users\\PC\\Desktop\\Systems\\vidyarth\\logs\\charon.err.log',
            log_date_format: 'YYYY-MM-DD HH:mm:ss',
            env: {
                NODE_ENV: 'production',
                PORT: process.env.PORT || '3000',
                NEXT_TELEMETRY_DISABLED: '1',
                NODE_OPTIONS: process.env.NODE_OPTIONS || '--enable-source-maps --max-old-space-size=2048',
                UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || '8'
            },
            exp_backoff_restart_delay: 200
        }
    ]
};
