'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */


const { parseMultipartData, sanitizeEntity } = require('strapi-utils');

module.exports = {
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
        status: 'approved',
      };
      
      if (ctx.query._q) {
        entities = await strapi.services.jokes.search(ctx.query);
      } else {
        entities = await strapi.services.jokes.find(ctx.query);
      }

      entities = entities.filter(elem => {
        let visibile = true;

        for(const tag of elem.tags){
            if(tag.adult_content) {
                visibile = false;
                break;
            }
        }
        
        if(!visibile) return undefined;
        else return elem;
      })
  
      return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.jokes }));
    },

    /**
     * Retrieve a record.
     *
     * @return {Object}
     */
  
    async findOne(ctx) {
      const { id } = ctx.params;
  
      const entity = await strapi.services.jokes.findOne({ id });
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },

    /**
     * Count records.
     *
     * @return {Number}
     */
  
    count(ctx) {
      if (ctx.query._q) {
        return strapi.services.jokes.countSearch(ctx.query);
      }
      return strapi.services.jokes.count(ctx.query);
    },

  
    async create(ctx) {
      let entity;
      let user = {};
      if (!ctx.state.user) { user.id = 88; }
      else { user = ctx.state.user; }

      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        data.author = user.id;
        entity = await strapi.services.jokes.create(data, { files });
      } 
      else {
        ctx.request.body.author = user.id;
        entity = await strapi.services.jokes.create(ctx.request.body);
      }

      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },


  
    async update(ctx) {
      const { id } = ctx.params;
  
      let entity;
      if (ctx.is('multipart')) {
        const { data, files } = parseMultipartData(ctx);
        entity = await strapi.services.jokes.update({ id }, data, {
          files,
        });
      } else {
        entity = await strapi.services.jokes.update({ id }, ctx.request.body);
      }
  
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },
  
    async delete(ctx) {
      const { id } = ctx.params;
  
      const entity = await strapi.services.jokes.delete({ id });
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },
  };