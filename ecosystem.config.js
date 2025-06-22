require('dotenv').config();

module.exports = {
    apps: [
        {
            name: 'vidyarth',
            script: './node_modules/next/dist/bin/next',
            args: 'start',
            env: {
                PORT: process.env.PORT || 3000,
                NODE_ENV: 'production',
            }
        }
    ]
};
