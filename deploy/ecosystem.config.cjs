module.exports = {
  apps: [
    {
      name: 'selfx-superadmin',
      cwd: './frontend/apps/admin',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
    {
      name: 'selfx-console',
      cwd: './frontend/apps/console',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3002',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1.5G',
      env: {
        NODE_ENV: 'production',
        PORT: 3002,
      },
    },
    {
      name: 'selfx-storefront',
      cwd: './frontend/apps/storefront',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3003',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1.5G',
      env: {
        NODE_ENV: 'production',
        PORT: 3003,
      },
    },
  ],
};
