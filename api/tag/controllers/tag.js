"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */
const { sanitizeEntity } = require("strapi-utils");

module.exports = {
	async find(ctx) {

		ctx.query = {
			...ctx.query,
			adult_content: false,
		};

		const result = await strapi.query('tag').find(ctx.query);
		let maxJokes = 0;
		result.forEach((tag) => {
			if (tag.jokes.length > maxJokes) {
			  maxJokes = tag.jokes.length;
			}
		
			tag.jokes = tag.jokes.length;
			tag.jokes_max = maxJokes;
		  });

		  return sanitizeEntity(result, { model: strapi.models.tag });

		


		if (ctx.query._q) {
			entities = await strapi.services.tag.search(ctx.query);
		} else {
			entities = await strapi.services.tag.find(ctx.query);
		}

		let max = 0;

		// replaces jokes result by count only under tag object
		entities.forEach((element) => {
			if (element.jokes.length > max) {
				max = element.jokes.length;
			}
			element.jokes = element.jokes.length;
		});

		// add jokes_max number for the overall tags to every tag to help with tag font-size functionality
		entities.forEach((element) => {
			element.jokes_max = max;
		});

		return entities.map((entity) =>
			sanitizeEntity(entity, { model: strapi.models.tag })
		);
	},
};
