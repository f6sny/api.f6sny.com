'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const {
	parseMultipartData,
	sanitizeEntity
} = require('strapi-utils');

module.exports = {
	/**
	 * Create a record.
	 *
	 * @return {Object}
	 */
	async create(ctx) {
        let entity;
        // Defaults to the API user
        ctx.request.body.author = ctx.state.user.id;
        // Cannot set status on create
        ctx.request.body.status = 'pending';
        
        entity = await strapi.services.joke.create(ctx.request.body);
		
		return sanitizeEntity(entity, {
			model: strapi.models.joke
		});
    },

    /**
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;

    ctx.query = {
        ...ctx.query,
        _limit: 20,
        _sort:'id:DESC',
        //'tags.visible': 1,
        status_nin: ['pending','community_rejected','admin_rejected']
      };
  
    if (ctx.query._q) {
        
      entities = await strapi.services.joke.search(ctx.query);
    } else {
      entities = await strapi.services.joke.find(ctx.query,);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.joke }));
  },
  
    
    /**
	 * Create a comment.
	 *
	 * @return {Object}
	 */
	async comment(ctx) {
		let entity;
		if (ctx.is('multipart')) {
			const {
				data,
				files
			} = parseMultipartData(ctx);
			data.author = ctx.state.user.id;
			entity = await strapi.services.comment.create(data, {
				files
			});
		} else {
            ctx.request.body.author = ctx.state.user.id;
            ctx.request.body.joke = ctx.params.id;
			entity = await strapi.services.comment.create(ctx.request.body);
		}
		return sanitizeEntity(entity, {
			model: strapi.models.comment
		});
	},

	/**
	 * Update a record.
	 *
	 * @return {Object}
	 */

	async update(ctx) {
		const {
			id
		} = ctx.params;

		let entity;
        
        // only edit own jokes
		const [joke] = await strapi.services.joke.find({
			id: ctx.params.id,
			'author.id': ctx.state.user.id,
		});

		if (!joke) {
			return ctx.unauthorized(`You can't update this entry`);
		}

        // Cannot set status on update
        delete ctx.request.body.status;
        delete ctx.request.body.author;

        entity = await strapi.services.joke.update({
            id
        }, ctx.request.body);
		

		return sanitizeEntity(entity, {
			model: strapi.models.joke
		});
    },
    

    /**
   * delete a record.
   *
   * @return {Object}
   */

  async delete(ctx) {
    const { id } = ctx.params;

    let entity;

    const [joke] = await strapi.services.joke.find({
        id: ctx.params.id,
        'author.id': ctx.state.user.id,
    });

    if (!joke) {
        return ctx.unauthorized(`You can't update this entry`);
    }

    entity = await strapi.services.joke.delete({ id });
    return sanitizeEntity(entity, { model: strapi.models.joke });
  },
};
