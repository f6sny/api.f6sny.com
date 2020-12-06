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
    let max = 0;
    entities.forEach(element => {
      if(element.jokes.length > max) max = element.jokes.length;
      element.jokes = element.jokes.length;
    });
    
    entities.forEach(element => {
      element.jokes_max = max;
    });

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.tag }));
  },

  async findOneBySlug(ctx) {
    const { slug } = ctx.params;

    const entity = await strapi.services.tag.findOne({ name: slug });
    return sanitizeEntity(entity, { model: strapi.models.tag });
  },


  async findJokesBySlug(ctx) {
    let entities;
    const {slug} = ctx.params;
    ctx.query = {
        ...ctx.query,
        _limit: 20,
        _sort:'id:DESC',
        'tags.name_in': [slug],
        status_nin: ['pending','community_rejected','admin_rejected'],
        _where: [{'tags.visible_ne': 0}]
      };
  
    if (ctx.query._q) {
        
      entities = await strapi.services.joke.search(ctx.query);
    } 
    else {
      entities = await strapi.services.joke.find(ctx.query,);
    }
    
    entities = entities.filter(elem => {
      let visibile = true;
      elem.tags.forEach(tag => {
        if(!tag.visible) visibile = false;
      });
      
      if(!visibile) return undefined;
      else return elem;
    })

    return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.joke }));
  },



};
