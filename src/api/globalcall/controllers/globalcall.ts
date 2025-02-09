import { Context } from "koa";

export default {
  async getCounters(ctx: Context) {
    try {
      const counters = {
        total_jokes: await strapi.db.query('api::joke.joke').count(),
        deleted_jokes: await strapi.db.query('api::joke.joke').count({ 
          where: { status: 'deleted' } 
        }),
        //comments: await strapi.db.query('plugin::comments.comment').count(),
        users: await strapi.db.query('plugin::users-permissions.user').count(),
        pending_jokes: await strapi.service('api::joke.joke').countPending(ctx),
        visits: 0,
      };
      return counters;
    } catch (error) {
      ctx.throw(500, error);
    }
  },

  async getLatestComments(ctx: Context) {
    try {
      const entities = await strapi.service("plugin::comments.comment").find({
        ...ctx.query, 
        pagination: { page: 1, pageSize: 10 },
        sort: { createdAt: 'desc' }
      });

      const filteredEntities = await Promise.all(
        entities.results.map(async (element) => {
          if (element.related[0]?.status === 'deleted') return null;

          const globalCallService = strapi.service('api::globalcall.globalcall');
          const isAdult = await globalCallService.isAdultJoke(element.related[0].id);
          
          return !isAdult ? element : null;
        })
      );

      return filteredEntities.filter(Boolean).slice(0, 10);
    } catch (error) {
      ctx.throw(500, error);
    }
  },


};
