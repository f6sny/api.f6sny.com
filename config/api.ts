export default ({ env }) => ({
  responses: {
    privateAttributes: ['_v', 'created_at'],
  },

  rest: {
    defaultLimit: 25,
    maxLimit: 100,
    withCount: true,
    
  },
});
