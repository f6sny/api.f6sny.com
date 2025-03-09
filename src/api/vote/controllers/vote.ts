/**
 * vote controller
 */

import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::vote.vote', ({ strapi }) => ({

    async create(ctx) {
        try {
            const { data } = ctx.request.body;
            const { user, fingerprint } = ctx.state;
            if (!data?.joke && !data?.page) {
                return ctx.badRequest('Missing target ID');
            }

            const identifier = user ? { author: user.id } : { fingerprint: fingerprint };

            // Check if the user or fingerprint has already voted on this joke
            const existingVote = await strapi.documents('api::vote.vote').findFirst({
                filters: {
                    $and: [
                        { joke: data.joke },
                        {
                            ...identifier
                        }
                    ]
                }

            });

            if (existingVote) {
                return ctx.badRequest('You have already voted on this content');
            }

            ctx.request.body.data.ip_address = ctx.request.ip;
            ctx.request.body.data.fingerprint = fingerprint; 
            console.log(data);

            // Create the vote with fingerprint
            return super.create(ctx);

        } catch (error) {
            return ctx.internalServerError(error.message);
        }
    }

}));


