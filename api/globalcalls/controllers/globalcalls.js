'use strict';

module.exports = {
  async getCounters(ctx) {
	const counters = {
		total_jokes: await strapi.services.jokes.count({...ctx.query}),
		pending_jokes: await strapi.services.jokes.count({...ctx.query, status_in:['pending']}),
		deleted_jokes: await strapi.services.jokes.count({...ctx.query, status_in:['deleted']}),
		comments: await strapi.query('comment', 'comments').count({...ctx.query}),
		users: await strapi.query('user', 'users-permissions').count({...ctx.query}),
		//members: await strapi. strapi.services.users.count({...ctx.query}),
		visits: 0,
	}
	return counters;
  },


  async getLatestComments(ctx) {
	let entities;
	ctx.query = {
		...ctx.query,
		_limit: 10,
		_sort: "id:DESC",
		// TODO: add one for status later, to filter out blocked or not active comments
	  };

	if (ctx.query._q) {
		entities = await strapi.query('comment', 'comments').search(ctx.query);
	} else {
		entities = await strapi.query('comment', 'comments').find(ctx.query,);
	}

	return entities;

	},
  
  
};
