import { factories } from '@strapi/strapi'
import { Context } from "koa";

export default factories.createCoreController('api::tag.tag', ({ strapi }) => ({
  async find(ctx) {
    const defaultJokesPopulate = {
      count: true,
      filters: { status: 'active' } // default filter
    };

    // Get any client-provided configuration
    const clientJokesPopulate = ctx.query.populate?.jokes || {};

    ctx.query.populate = {
      ...ctx.query.populate,
      jokes: {
        ...defaultJokesPopulate,
        ...clientJokesPopulate,
        // Ensure that if the client has defined filters, we use them;
        // otherwise, we fall back to our default filters.
        filters: clientJokesPopulate.hasOwnProperty('filters')
          ? clientJokesPopulate.filters
          : defaultJokesPopulate.filters
      }
    };

    const { data, meta } = await super.find(ctx);
    return { data, meta };
  },

  async findOne(ctx) {
    const defaultJokesPopulate = {
      count: true,
      filters: { status: 'active' }
    };

    const clientJokesPopulate = ctx.query.populate?.jokes || {};

    ctx.query.populate = {
      ...ctx.query.populate,
      jokes: {
        ...defaultJokesPopulate,
        ...clientJokesPopulate,
        filters: clientJokesPopulate.hasOwnProperty('filters')
          ? clientJokesPopulate.filters
          : defaultJokesPopulate.filters
      }
    };

    ctx.query.select = ['name', 'adult_content', 'createdAt', 'updatedAt'];

    const entity = await super.findOne(ctx);
    return {
      ...entity,
      data: {
        ...entity.data,
        attributes: {
          ...entity.data.attributes,
          jokeCount: entity.data.attributes.jokes?.count || 0,
          jokes: undefined // remove full jokes data if count exists
        }
      }
    };
  }
}));
