export default (config, { strapi }) => {
    return async (ctx, next) => {
      // Continue with the request
      await next();
      
      // Only process for joke-related endpoints
      if (!ctx.url.includes('/api/jokes')) return;
      
      // Only apply to find and findOne operations
      if (!ctx.response.body || !ctx.response.body.data) return;
      
      const { user, fingerprint } = ctx.state;
      const identifier = user ? { author: user.id } : { fingerprint: fingerprint };
      
      // Handle both single object and array responses
      const isArray = Array.isArray(ctx.response.body.data);
      const jokes = isArray ? ctx.response.body.data : [ctx.response.body.data];
      
      // Enhance each joke with user's vote information
      const enhancedJokes = await Promise.all(jokes.map(async (joke) => {
        const userVote = await strapi.documents('api::vote.vote').findFirst({
          filters: {
            $and: [
              { joke: joke.id },
              { ...identifier }
            ]
          },
          fields: ['value', 'documentId', 'id']
        });
        
        return {
          ...joke,
          userVote: userVote ? {value: userVote.value, documentId: userVote.documentId, id: userVote.id} : null,
          hasVoted: !!userVote
        };
      }));
      
      // Update the response
      ctx.response.body.data = isArray ? enhancedJokes : enhancedJokes[0];
    };
  };
  