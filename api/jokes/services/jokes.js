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

        // will store the response in this variable.
        let entities;

        // IP Address of the user, will be used as identifier if no user_id was provided
        const ip_address = ctx.req.socket._peername.address;

        // Store the user object (if any)
        let request_user = (ctx.state.user);
        
        // To store the ids of jokes he already voted on.
        let already_voted_ids_only = await this.getAlreadyVoted(request_user, ip_address);

        // Now lets get the pending jokes
        // MAKE the query while id not in the array already_voted_ids_only
        ctx.query = {
            id_nin: already_voted_ids_only,
            _sort:'id:DESC',
            status: 'pending',
        };

        if (ctx.query._q) {
            entities = await strapi.services.jokes.search(ctx.query);
        } 
        else {
          entities = await strapi.services.jokes.find(ctx.query);
        }
        
        // Clean the result from adult content
        entities = strapi.services.globalcalls.clean_adult_content(entities,0);

        return entities.length;
    },
    
};
