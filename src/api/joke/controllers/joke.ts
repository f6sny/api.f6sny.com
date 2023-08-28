/**
 * joke controller
 */

import { factories } from '@strapi/strapi'
import { Context } from "koa";

export default factories.createCoreController('api::joke.joke', {
    async find(ctx: Context) {
        const limit = parseInt(Array.isArray(ctx.query.limit) ? ctx.query.limit[0] : ctx.query.limit) || strapi.config.get('api.rest.defaultLimit', 25);
        const start = parseInt(Array.isArray(ctx.query.start) ? ctx.query.start[0] : ctx.query.start) || 0;
    
        const entities = await strapi.entityService.findMany('api::joke.joke', { ...ctx.query, limit, start, populate: ['votes', 'tags'],});

        return entities;
      },
    
      async findOne(ctx: Context) {
        const { id } = ctx.params;
        const entity = await strapi.entityService.findOne('api::joke.joke', { where: { id }, populate: ['votes', 'tags'], });
        return entity;
      },
    
    count(ctx) {
        var { query } = ctx.request
        return strapi.query('api::joke.joke').count({ where: query });
    }
});


// const { createCoreController } = require('@strapi/strapi').factories;
// module.exports = createCoreController('api::joke.joke', ({ strapi }) => ({
//     async find(ctx) {
//       // Calling the default core action
//       const { data, meta } = await super.find(ctx);
//       const query = strapi.db.query('api::joke.joke');
//       await Promise.all(
//         data.map(async (item, index) => {
//           const foundItem = await query.findOne({
//             where: {
//               id: item.id,
//             },
//             populate: ['createdBy', 'updatedBy'],
//           });
          
//           data[index].attributes.createdBy = {
//             id: foundItem.createdBy.id,
//             firstname: foundItem.createdBy.firstname,
//             lastname: foundItem.createdBy.lastname,
//           };
//           data[index].attributes.updatedBy = {
//             id: foundItem.updatedBy.id,
//             firstname: foundItem.updatedBy.firstname,
//             lastname: foundItem.updatedBy.lastname,
//           };
//         })
//       );
//       return { data, meta };
//     },
//   }));
  
