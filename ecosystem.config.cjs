module.exports = {
  apps: [{
    name: '5am-club-bot',
    script: 'src/index.js',
    
    // Cron pattern to START the bot at 4:45 AM (Mon-Fri)
    cron_restart: '45 4 * * 1-5',
    
    // Don't auto-restart when it exits cleanly (exit code 0)
    autorestart: false,
    
    // Environment variables
    env: {
      NODE_ENV: 'production'
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


