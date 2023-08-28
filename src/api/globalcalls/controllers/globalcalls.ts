const { filter_array } = require('../../../utilities/mfo_tools')

export default {
    async getCounters(ctx) {
		const counters = {
			total_jokes: 	await strapi.services.jokes.count({...ctx.query}),
			deleted_jokes: 	await strapi.services.jokes.count({...ctx.query, status_in:['deleted']}),
			comments: 		await strapi.query('comments').count({...ctx.query}),
			users: 			await strapi.query('users-permissions').count({...ctx.query}),
			pending_jokes: 	await strapi.services.jokes.countPending(ctx),
			//members: await strapi. strapi.services.users.count({...ctx.query}),
			visits: 0,
		}
		return counters;
	},

	async getLatestComments(ctx) {
		let entities;
		ctx.query = {
			...ctx.query,
			_limit: 30,
			_sort: "id:DESC",		
			// TODO: add one for status later, to filter out blocked or not active comments
			};

		if (ctx.query._q) {
			entities = await strapi.query('comments').search(ctx.query);
		} else {
			entities = await strapi.query('comments').find(ctx.query,);
		}

		// remove deleted jokes and adult content
		entities = await filter_array(entities, async element => {
			let keep = true;
			if(element.related[0].status == 'deleted'){
				keep = false;
			}
			
			let is_adult_joke = await strapi.services.globalcalls.isAdultJoke(element.related[0].id);
			if(is_adult_joke){
				console.log("is adult")
				keep = false;
			}

			return keep;
		})

		//console.log(entities[0])
		return entities.slice(0,10);

	},
  
	async updateProfile(ctx){
		return;
	}
}