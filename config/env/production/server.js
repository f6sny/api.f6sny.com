module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 80),
  url: env("URL", "https://api.f6sny.com"),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET'),
    },
  },
});
