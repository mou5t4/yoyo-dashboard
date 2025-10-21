module.exports = {
  apps: [
    {
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
    },
    {
      name: 'mock-battery-service',
      script: 'tsx',
      args: 'services/mock-battery-service.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '50M',
      env: {
        BATTERY_UPDATE_INTERVAL: '30000',  // 30 seconds
        DISCHARGE_RATE: '0.5',              // 0.5% per minute
        CHARGE_RATE: '1.0',                 // 1% per minute
      },
      error_file: './logs/battery-error.log',
      out_file: './logs/battery-output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true
    },
    {
      name: 'mock-gps-service',
      script: 'tsx',
      args: 'services/mock-gps-service.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '50M',
      env: {
        LOCATION_UPDATE_INTERVAL: '30000',  // 30 seconds
        GPS_CENTER_LAT: '37.7749',          // San Francisco latitude
        GPS_CENTER_LON: '-122.4194',        // San Francisco longitude
        GPS_WALK_RADIUS: '500',             // 500 meters
      },
      error_file: './logs/gps-error.log',
      out_file: './logs/gps-output.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      time: true
    }
  ]
};

