'use strict';

module.exports = {
    async getAlreadyVoted(request_user, ip_address){
      // Check if reqeuster is  not administrator , then get the list of all jokes voted on.
      let result;
      if(request_user?.role?.name != "Administrator"){
        // GET WHAT USER ALREADY VOTED ON
        let connection_string = this.getAlreadyVotedConnectionString(request_user, ip_address);

        const rawBuilder = strapi.connections.default.raw(connection_string);
        const resp = await rawBuilder.then();
        const already_voted = resp[0];

        return already_voted.map(elem => {
            return elem.joke_id;
        })
      }
    },

    getAlreadyVotedConnectionString(request_user, ip_address){
      // bare-metals knex query on the db, get user previous votes, either by IP or user ID
      let connection_string = 'select jokes__votes.joke_id from votes left join jokes__votes on jokes__votes.vote_id = votes.id where ';

      // Check the identifier
      if(request_user) { connection_string += `author = "${request_user.id}" OR` }
      connection_string += ` ip_address = "${ip_address} group by joke_id"`
      return connection_string;
    },

    async countPending(ctx) {
      const ipAddress = ctx.req.socket._peername.address;
      const user = ctx.state.user;
      const alreadyVotedIds = await this.getAlreadyVoted({ user, ipAddress });
    
      const query = {
        id_nin: alreadyVotedIds,
        _sort: 'id:DESC',
        status: 'pending',
      };
    
      const entities = ctx.query._q
        ? await strapi.services.jokes.search(query)
        : await strapi.services.jokes.find(query);
    
      const cleanedEntities = strapi.services.globalcalls.clean_adult_content(entities, 0);
    
      return cleanedEntities.length;
    }
};
