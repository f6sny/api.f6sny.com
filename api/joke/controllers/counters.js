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
	

  async get(ctx) {
    const counters = {
        total_jokes: await strapi.services.joke.count({...ctx.query}),
        pending_jokes: await strapi.services.joke.count({...ctx.query, status_in:['pending']}),
        deleted_jokes: await strapi.services.joke.count({...ctx.query, status_in:['community_rejected', 'admin_rejected']}),
        comments: await strapi.services.comment.count({...ctx.query}),
        //members: await strapi. strapi.services.users.count({...ctx.query}),
        visits: 0,
    }
    return counters;
  },
  
  
};
