/**
 * tag controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::tag.tag', ({ strapi }) => ({
    async find(ctx) {

   
        const { data, meta } = await super.find(ctx);
        return { data, meta };

    },
}));
