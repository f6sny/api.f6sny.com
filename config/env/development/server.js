module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 8080),
  url: env("URL", "http://localhost:8080"),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', '4a3bbe1a33e1e640e4d548982e90aa1f'),
    },
  },
});
