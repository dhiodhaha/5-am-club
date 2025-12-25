module.exports = {
  apps: [{
    name: '5am-club-bot',
    script: 'dist/index.js',  // Built TypeScript output
    
    // Cron pattern to START the bot at 2:55 AM (Mon-Fri)
    cron_restart: '55 2 * * 1-5',
    
    // Don't auto-restart when it exits cleanly (exit code 0)
    autorestart: false,
    
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


