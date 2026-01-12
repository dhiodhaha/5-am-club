module.exports = {
  apps: [{
    name: '5am-club-bot',
    script: 'dist/index.js',  // Built TypeScript output

    // Cron pattern to START the bot at 2:55 AM (Mon-Fri)
    cron_restart: '55 2 * * 1-5',

    // CRITICAL: Prevent PM2 from auto-restarting
    autorestart: false,
    watch: false,

    // Only restart on these exit codes (empty = never restart on exit)
    // Exit code 0 = clean shutdown, don't restart
    stop_exit_codes: [0],

    // Max restarts in case of crash (not clean exit)
    max_restarts: 0,

    // Environment variables
    env: {
      NODE_ENV: 'production',
      TZ: 'Asia/Jakarta'  // Important: PM2 cron uses this timezone
    },

    // Logging
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    merge_logs: true,

    // Timezone for cron (important!)
    // Note: PM2 cron uses system timezone, ensure your server is set correctly
    // Or use TZ environment variable
  }]
};

// IMPORTANT: After updating this config, run these commands:
// 1. pm2 delete 5am-club-bot
// 2. pm2 start ecosystem.config.cjs
// 3. pm2 save --force


