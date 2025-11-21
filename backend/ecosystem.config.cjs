module.exports = {
  apps: [{
    name: 'management-tool-backend',
    script: 'server.js',
    cwd: '/var/www/managementTool/backend',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: '/var/www/managementTool/backend/logs/err.log',
    out_file: '/var/www/managementTool/backend/logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M',
    watch: false,
    interpreter: 'node',
    interpreter_args: ''
  }]
};

