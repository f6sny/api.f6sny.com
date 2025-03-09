
export default {
  async getCounters(ctx) {
    try {
      const counters = {
        total_jokes: await strapi.documents('api::joke.joke').count({}),
        deleted_jokes: await strapi.documents('api::joke.joke').count({ 
          filters: { joke_status: 'deleted' } 

        }),
        comments: await strapi.db.query('plugin::comments.comment').count(),
        users: await strapi.documents('plugin::users-permissions.user').count({}),
        pending_jokes: await strapi.documents('api::joke.joke').count({
          filters: {joke_status: 'pending'}
        }),
        visits: 0,
      };
      return counters;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getLatestComments(ctx) {
    try {

      const commentsWithJokes = await strapi.entityService.findMany('plugin::comments.comment', {
        populate: '*',
        limit: 10,
        sort: ['createdAt:desc']
        
      });
      
      return commentsWithJokes

    } catch (error) {
      ctx.throw(500, error);
    }
  },


};
