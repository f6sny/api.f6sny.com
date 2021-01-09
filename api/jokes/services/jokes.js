'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
    async countPending(ctx) {
        let entities;
        const ip_address = ctx.req.socket._peername.address;

        let authorized_id = (ctx.state.user);
        
        let already_voted_ids_only;
        if(authorized_id && authorized_id.role.name == "Administrator"){
            //Do nothing and show all jokes for force moderation
        }
        else{
            // GET WHAT USER ALREADY VOTED ON
            // bare-metals knex query on the db, get user previous votes, either by IP or user ID
            let connection_string = `select jokes__votes.joke_id from votes left join jokes__votes on jokes__votes.vote_id = votes.id`;

            if(authorized_id) { connection_string += ` where author = "${authorized_id.id}" OR ip_address = "${ip_address}"` }
            else { connection_string += ` where ip_address = "${ip_address}"` }
            connection_string += ` group by joke_id`;

            console.log("From Service "+connection_string)
            const rawBuilder = strapi.connections.default.raw(connection_string);
            const resp = await rawBuilder.then();
            const already_voted = resp[0];
            already_voted_ids_only = already_voted.map(elem => {
            return elem.joke_id;
        })
        }

        // MAKE the query while id not in the array
        ctx.query = {
            id_nin: already_voted_ids_only,
            _sort:'id:DESC',
            status: 'pending',
        };

        if (ctx.query._q) {
            entities = await strapi.services.jokes.search(ctx.query);
          } else {
            entities = await strapi.services.jokes.find(ctx.query);
          }
        
        entities = strapi.services.globalcalls.clean_adult_content(entities,0);

        return entities.length;
      },
    
};
