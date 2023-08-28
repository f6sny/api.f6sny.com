/**
 * joke service
 */

import { factories } from '@strapi/strapi';
import { Context } from "koa";


export default factories.createCoreService('api::joke.joke', {

  // enhanced with chatgpt
  async countPending(ctx: Context) {
    const ipAddress = ctx.req.socket.remoteAddress || ctx.request.socket.remoteAddress;
    const { user } = ctx.state;

    const alreadyVotedIds = await this.getAlreadyVoted(user, ipAddress);

    const query = {
      id_nin: alreadyVotedIds,
      _sort: 'id:DESC',
      status: 'pending',
      populate: 'tags'
    };

    const entities = ctx.query._q ? await strapi.service('api::joke.joke').search(query) : await strapi.service('api::joke.joke').find(query);

    const cleanedEntities = strapi.service('api::globalcall.globalcall').clean_adult_content(entities.results, false);

    return cleanedEntities.length;
  },

  // Function to get the IDs of jokes that the user or IP has already voted on
  async getAlreadyVoted(user: any, ipAddress: string) {
    let alreadyVotedIds: number[] = [];

    const query: any = { _or: [] };
    if (user) {
      query._or.push({ 'jokes_votes_links.vote_id.author': user.id });
    }
    query._or.push({ 'jokes_votes_links.vote_id.ip_address': ipAddress });

    const jokesWithVotes = await strapi.db.query('api::joke.joke').findMany(query);
    alreadyVotedIds = jokesWithVotes.map(joke => joke.id);

    return alreadyVotedIds;
  }

  // async getAlreadyVoted(request_user, ip_address) {
  //   console.log("getAlreadyVoted", request_user, ip_address)
  //   // Check if reqeuster is  not administrator , then get the list of all jokes voted on.
  //   let result;
  //   if (request_user?.role?.name != "Administrator") {
  //     // GET WHAT USER ALREADY VOTED ON
  //     let connection_string = this.getAlreadyVotedConnectionString(request_user, ip_address);

  //     const rawBuilder = strapi.db.connection.raw(connection_string);
  //     const resp = await rawBuilder.then();
  //     const already_voted = resp[0];

  //     return already_voted.map(elem => {
  //       return elem.joke_id;
  //     })
  //   }
  // },

  // getAlreadyVotedConnectionString(request_user, ip_address) {
  //   // native db query  to get user previous votes, either by IP or user ID
  //   let connection_string = `
  //         select jokes_votes_links.joke_id 
  //         from votes 
  //         left join jokes_votes_links on jokes_votes_links.vote_id = votes.id
  //         left join jokes_author_links on jokes_author_links.joke_id = jokes_votes_links.joke_id
          
  //         where `;

  //   // Check the identifier
  //   if (request_user) { connection_string += `author = "${request_user.id}" OR` }
  //   connection_string += ` ip_address = "${ip_address} group by joke_id"`
  //   return connection_string;
  // },

  // async countPending(ctx: Context) {
  //   const ipAddress = ctx.req.socket.remoteAddress || ctx.request.socket.remoteAddress //ctx.req.socket._peername.address;
  //   const { isAuthenticated, user } = ctx.state // check if authenticated request or not, might be useful in another file
  //   const alreadyVotedIds = await this.getAlreadyVoted({ user, ipAddress });

  //   const query = {
  //     id_nin: alreadyVotedIds,
  //     _sort: 'id:DESC',
  //     status: 'pending',
  //   };

  //   const entities = ctx.query._q ? await strapi.services.jokes.search(query) : await strapi.services.jokes.find(query);

  //   const cleanedEntities = strapi.services.globalcalls.clean_adult_content(entities, 0);

  //   return cleanedEntities.length;
  // }
});
