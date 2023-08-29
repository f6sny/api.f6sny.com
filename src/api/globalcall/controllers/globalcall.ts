import { Context } from "koa";

export default {
	async getCounters(ctx: Context) {
		try {
			const counters = {
				total_jokes: await strapi.query('api::joke.joke').count({ ...ctx.query }),
				deleted_jokes: await strapi.query('api::joke.joke').count({ status: 'deleted' }),
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
			let entities;

			entities = await strapi.service("plugin::comments.comment").find({...ctx.query, _limit: 10, _sort: 'created_at:desc' });

			// remove deleted jokes and adult content
			// Get an array of promises based on your conditions
			const results = await Promise.all(entities.map(async element => {
				if (element.related[0].status === 'deleted') {
					return false;
				}

				const is_adult_joke = await strapi.service('api::globalcall.globalcall').isAdultJoke(element.related[0].id);
				return !is_adult_joke;
			}));

			// Filter the original array based on the resolved promises
			entities = entities.filter((_, index) => results[index]);

			//console.log(entities[0])
			return entities.slice(0, 10);
		} catch (error) {

		}
	},

	async updateProfile(ctx: Context) {
		return;
	}
};

