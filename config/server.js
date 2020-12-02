module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 8080),
  url: env("URL", "http://localhost:8080"),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'd0a910289dadbd7c666d6fc88955e7e3'),
    },
  },
});
