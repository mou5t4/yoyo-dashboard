module.exports = {
  apps: [{
    name: 'yoyopod-dashboard',
    script: 'npm',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      SESSION_SECRET: 'dev-secret-change-in-production-12345678',
      DATABASE_URL: 'file:./yoyopod.db',
      SERVICE_TOKEN: 'dev-token',
      SERVICE_BASE_URL: 'http://localhost:5000/api',
      LOG_LEVEL: 'info',
      LOG_DIR: 'logs'
    },
    error_file: './logs/error.log',
    out_file: './logs/output.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    time: true
  }]
};

