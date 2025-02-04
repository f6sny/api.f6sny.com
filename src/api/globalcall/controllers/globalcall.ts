import { Context } from "koa";

export default {
	async getCounters(ctx: Context) {
		try {
			const counters = {
				total_jokes: await strapi.query('api::joke.joke').count({ ...ctx.query }),
				deleted_jokes: await strapi.query('api::joke.joke').count({ where: { status: 'deleted' } }),
				comments: await strapi.query('plugin::comments.comment').count({ ...ctx.query }),
				users: await strapi.query('plugin::users-permissions.user').count({ ...ctx.query }),
				pending_jokes: await strapi.service('api::joke.joke').countPending(ctx),
				//members: await strapi. strapi.services.users.count({...ctx.query}),
				visits: 0,
			}
			return counters;
		} catch (error) {
			ctx.body = error;
		}
	},

	// TODO: This might be replaced with native comments plugin
	async getLatestComments(ctx: Context) {
		try {
			let entities = await strapi.service("plugin::comments.comment").find({...ctx.query, _limit: 10, _sort: 'created_at:desc' });

			const results = await Promise.all(entities.map(async element => {
				if (element.related[0].status === 'deleted') {
					return false;
				}

				const globalCallService = strapi.service('api::globalcall.globalcall');
				const isAdult = await globalCallService.isAdultJoke(element.related[0].id);
				return !isAdult;
			}));

			entities = entities.filter((_, index) => results[index]);
			return entities.slice(0, 10);
		} catch (error) {
			// handle error
		}
	},

	async updateProfile(ctx: Context) {
		return;
	},

	async someAction(ctx: Context) {
		const globalCallService = strapi.service('api::globalcall.globalcall');
		const isAdult = await globalCallService.isAdultJoke(123);
		// ... other code ...
	}
};

