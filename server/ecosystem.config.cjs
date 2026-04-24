module.exports = {
  apps: [
    {
      name: 'farm',
      script: './index.js',
      cwd: '/opt/farm/server',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
