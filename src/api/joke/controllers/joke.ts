/**
 * joke controller
 */

import { factories } from '@strapi/strapi'
import { Context } from "koa";

export default factories.createCoreController('api::joke.joke', ({ strapi }) => ({
    async find(ctx) {
        // Add populate and filters to query
        ctx.query = {
            ...ctx.query,
            populate: ['votes', 'tags', 'author', 'createdBy', 'updatedBy'], 
        };

        // Call the default parent controller action
        const result = await super.find(ctx);

        return result;
    },
    
    async findOne(ctx: Context) {
        const { id } = ctx.params;
        const entity = await strapi.entityService.findOne('api::joke.joke', id, {
            populate: ['votes', 'tags',  'author', 'createdBy', 'updatedBy'],
        });
        return entity;
    },
    
    count(ctx) {
        var { query } = ctx.request
        return strapi.query('api::joke.joke').count({ where: query });
    }
}));



/*
const { sanitizeEntity } = require('strapi-utils');

module.exports = {
    async find(ctx) {
      let entities;

      ctx.query = {
        ...ctx.query,
        _limit: 20,
        _sort:'id:DESC',
        status: 'active',
      };
      
      if (ctx.query._q) {
        entities = await strapi.services.jokes.search(ctx.query);
      } else {
        entities = await strapi.services.jokes.find(ctx.query);
      }

      entities = entities.filter(elem => {
        let visibile = true;

        elem.tags.forEach(element => {
          if(element.adult_content) {
            visibile = false;
            return;
        }
        });
        
        if(!visibile) return undefined;
        else return elem;
      })
  
      return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.jokes }));
    },

    async findPending(ctx) {
        let entities;

        const ip_address = ctx.req.socket._peername.address;

        const current_user = (ctx.state.user);
        
        let already_voted_ids_only = await this.getAlreadyVoted(current_user, ip_address);

        // MAKE the query while id not in the array
        ctx.query = {
            id_nin: ctx.query?.id_nin?.concat(already_voted_ids_only),
            _sort:'id:DESC',
            status: 'pending',
        };

        if (ctx.query._q) {
            entities = await strapi.services.jokes.search(ctx.query);
          } 
          else {
            entities = await strapi.services.jokes.find(ctx.query);
          }
        
        entities = strapi.services.globalcalls.clean_adult_content(entities,0);

        // return the top one only
        return sanitizeEntity(entities[0], { model: strapi.models.jokes });
    },

    async getAlreadyVoted(current_user, ip_address){
      // Check if reqeuster is  not administrator , then get the list of all jokes voted on.
      let result;
      if(current_user?.role?.name != "Administrator"){
        // GET WHAT USER ALREADY VOTED ON
        let connection_string = this.getAlreadyVotedConnectionString(current_user, ip_address);

        const rawBuilder = strapi.connections.default.raw(connection_string);
        const resp = await rawBuilder.then();
        const already_voted = resp[0];

        return already_voted.map(elem => {
            return elem.joke_id;
        })
      }
    },

    getAlreadyVotedConnectionString(current_user, ip_address){
      // bare-metals knex query on the db, get user previous votes, either by IP or user ID
      let connection_string = 'select jokes__votes.joke_id from votes left join jokes__votes on jokes__votes.vote_id = votes.id where ';

      // Check the identifier
      if(current_user) { connection_string += `author = "${current_user.id}" OR` }
      connection_string += ` ip_address = "${ip_address} group by joke_id"`
      return connection_string;
    },

    async findOne({ params: { id } }) {
      const entity = await strapi.services.jokes.findOne({ id });
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },
  
    count(ctx) {
      return ctx.query._q ? strapi.services.jokes.countSearch(ctx.query) : strapi.services.jokes.count(ctx.query);
    },
    

    async create(ctx) {
        // Set the user either authenticated or logged in
        const author = ctx.state.user?.id || 88;
        ctx.request.body.author = author;

        // If Joke does not start with ygool lik
        const { content, tags } = ctx.request.body;
        if(!content.startsWith('يقول لك')) ctx.throw(400, 'النكتة ما تبدا ب "يقول لك"');
        // If Joke less than 19 characters
        if(content.length<= 19) ctx.throw(400, 'النكتة أقصر من 20 حرف, يقول لك بلحالها 9 حروف');
        // If joke does not have category
        if(!tags || tags.length < 1) ctx.throw(400, 'اختر عالأقل تصنيف واحد يالغالي');
        
        // Set IP address and status
        ctx.request.body.ip_address = ctx.req.socket._peername.address;
        const isAdmin = ctx.state.user?.role.name === 'Administrator';
        ctx.request.body.status = isAdmin ? 'active' : 'pending';
        
        // Clean joke content and create entity
        //ctx.request.body.content = clean_arabic(content);
        // TODO: still need to clean arabic from tanween
        const entity = await strapi.services.jokes.create(ctx.request.body);
            
        return sanitizeEntity(entity, { model: strapi.models.jokes });

    },

    async vote(ctx) {
        const joke_id = ctx.params.id;
        const ip_address = ctx.req.socket._peername.address;
		const current_user = ctx.state.user;
        const vote_value = ctx.request.body.data.value;
		const joke_acceptance_threshold = 10; // now fixed in db to 10

        let votes_up_count = 0;
        let votes_down_count = 0;
        
		let targeted_joke_for_vote = await strapi.services.jokes.findOne({id: joke_id});

        // apply the vote on the counter
        if(vote_value =="up") votes_up_count++;
        if(vote_value =="down") votes_down_count++;

        // either add the ip address or the author to the vote record
		ctx.request.body = {
			...ctx.request.body,
			author: current_user ? current_user.id : null,
			ip_address: current_user ? null : ip_address
		};
        
        // Loop through votes to see IP or user ID, Check if this user voted before, and count votes
        for(const vote of targeted_joke_for_vote.votes){ 
            // increment anyway, it wouldn't register to db if an error was thrown
            if(vote.value == "up") votes_up_count++;
            if(vote.value == "down") votes_down_count++;
            
            // if is admin, skip
			//console.log('current_user',current_user)
            if (current_user?.role?.name == 'Administrator') {
				if(vote.author && vote.author == current_user.id) ctx.throw(400, 'Already voted, same author');
              	continue;
            }

            // if authenticated, check vote author, if not, check IP address
			
            if(current_user){
              if(vote.author && vote.author == current_user.id) ctx.throw(400, 'Already voted, same author');
            }
            else{
              if(vote.ip_address == ip_address) ctx.throw(400, 'Already voted, same ip');
            }
        }
        
        let vote = await strapi.services.votes.create(ctx.request.body);
        
        // check against threshold and change status only if it was pending, if jokes vote count exceeds joke_acceptance_threshold, make public or delete
        if(targeted_joke_for_vote.status == 'pending'){
            // Force change status of joke to active or deleted for admin users
			if(current_user?.role?.name == "Administrator"){
				if(vote_value =="up") targeted_joke_for_vote.status = "active";
				if(vote_value =="down") targeted_joke_for_vote.status = "deleted";
				targeted_joke_for_vote.remarks += " ## " + `forced ${targeted_joke_for_vote.status} by administrator ${current_user.username}`;
			}
			else{
				if(votes_up_count >= joke_acceptance_threshold){
					targeted_joke_for_vote.status = "active";
				}
				else if(votes_down_count >= joke_acceptance_threshold){
					targeted_joke_for_vote.status = "deleted";
				}
			}

            // Prepare for a remarks entry update
            targeted_joke_for_vote.remarks += " ## " + `the vote is ${vote.value}, total ups: ${votes_up_count}, total downs:  ${votes_down_count}, joke_acceptance_threshold is: ${joke_acceptance_threshold}, status should be:  ${targeted_joke_for_vote.status} at: ${Date.now()}`;
        }

        // Add to the votes to Joke with the updated status
        let joke_that_was_subject_to_voting = await strapi.query('jokes').update({id: joke_id},{
            "status": targeted_joke_for_vote.status, 
            "votes":	targeted_joke_for_vote.votes.map((vote) => vote.id).concat(vote.id),
            "remarks": targeted_joke_for_vote.remarks
        });

        // remove ip address info for response
        joke_that_was_subject_to_voting.votes.map(elem =>{
            delete vote.ip_address;
        })	 	
        
        return sanitizeEntity(joke_that_was_subject_to_voting, { model: strapi.models.jokes });
    },

    async update(ctx) {
      const { id } = ctx.params;
    
    // only edit own jokes
    const [joke] = await strapi.services.joke.find({
        id: ctx.params.id,
        'author.id': ctx.state.user.id,
    });

    if (!joke) {
        return ctx.unauthorized(`You can't update this entry`);
    }
        
      // Cannot set status or author on update
      ctx.request.body.ip_address = ctx.req.socket._peername.address;
      // Cannot set status on update
      delete ctx.request.body.status;
      delete ctx.request.body.author;

      let entity;

        entity = await strapi.services.jokes.update({ id }, ctx.request.body);
  
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },
  
    async delete(ctx) {
      const { id } = ctx.params;
  
      const [joke] = await strapi.services.joke.find({
        id: ctx.params.id,
        'author.id': ctx.state.user.id,
        });

        if (!joke) {
            return ctx.unauthorized(`You can't delete this entry`);
        }
        
      const entity = await strapi.services.jokes.delete({ id });
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },
  };

*/

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
  
