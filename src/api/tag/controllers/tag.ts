/**
 * tag controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::tag.tag');

// const { sanitizeEntity } = require("strapi-utils");

// module.exports = {
// 	async find(ctx) {

// 		ctx.query = { ...ctx.query, adult_content: false, };

// 		const result = await strapi.query('tag').find(ctx.query);
// 		let maxJokes = 0;
// 		result.forEach((tag) => {
// 			if (tag.jokes.length > maxJokes) {
// 			  maxJokes = tag.jokes.length;
// 			}
		
// 			tag.jokes = tag.jokes.length;
// 			tag.jokes_max = maxJokes;
// 		  });

// 		  return sanitizeEntity(result, { model: strapi.models.tag });
// 	},
// };
