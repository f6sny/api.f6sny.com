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
   * Retrieve records.
   *
   * @return {Array}
   */

  async find(ctx) {
    let entities;
    let visible_only = 1;
    ctx.query = {
        ...ctx.query,
        _limit: 20,
        visible: 1,
      };

    

    if (ctx.query._q) {
        
      entities = await strapi.services.tag.search(ctx.query);
    } else {
      entities = await strapi.services.tag.find(ctx.query,);
    }

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.tag }));
  },



};
