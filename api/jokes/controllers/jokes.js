'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */


const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
//const joke = require('../../../old/api/joke/controllers/joke');

// function to clean adult content based on user preference
const clean_adult_content = (jokes_array,adult_selection) => {
    if(!adult_selection){
        jokes_array = jokes_array.filter(elem => {
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
    }
    return jokes_array;
};
const clean_arabic = (string) => {
    
};
module.exports = {
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
      console.log(entities);
  
      return entities.map(entity => sanitizeEntity(entity, { model: strapi.models.jokes }));
    },

    async findPending(ctx) {
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
        
        entities = clean_adult_content(entities,0);

        // return the top one only
        return sanitizeEntity(entities[0], { model: strapi.models.jokes });
    },

    async findOne(ctx) {
      const { id } = ctx.params;
  
      const entity = await strapi.services.jokes.findOne({ id });
      return sanitizeEntity(entity, { model: strapi.models.jokes });
    },
  
    count(ctx) {
      if (ctx.query._q) {
        return strapi.services.jokes.countSearch(ctx.query);
      }
      return strapi.services.jokes.count(ctx.query);
    },

    async create(ctx) {
        let entity;
        
        // set the user either authenticated or logged in
        if (!ctx.state.user) { ctx.request.body.author = 88; }
        else { ctx.request.body.author = ctx.state.user.id; }

        // Need to check for Errors
        // If Joke does not start with ygool lik
        if(!ctx.request.body.content.startsWith('يقول لك')) ctx.throw(400, 'النكتة ما تبدا ب "يقول لك"');
        // If Joke less than 19 characters
        if(ctx.request.body.content.length<= 19) ctx.throw(400, 'النكتة أقصر من 20 حرف, يقول لك بلحالها 9 حروف');
        // If joke does not have category
        if(!ctx.request.body.tags || ctx.request.body.tagslength < 1) ctx.throw(400, 'اختر عالأقل تصنيف واحد يالغالي');
        
        //ctx.request.body.content = clean_arabic(ctx.request.body.content);
        // TODO still need to clean arabic from tanween
        console.log('i am here')
        entity = await strapi.services.jokes.create(ctx.request.body);
        
        return sanitizeEntity(entity, { model: strapi.models.jokes });
    },

    async vote(ctx) {
        const joke_id = ctx.params.id;
        const ip_address = ctx.req.socket._peername.address;
        let votes_up = 0;
        let votes_down = 0;
        //console.log(ctx.request.body)
        const vote_value = ctx.request.body.data.value;
        // Threshold is now fixed in db to 10
        const threshold = 10;

        if(vote_value =="up") votes_up++;
        if(vote_value =="down") votes_down++;

        // Either IP address or user_id for recording of user
        let authorized_id = (ctx.state.user);
        if (!authorized_id) { ctx.request.body.ip_address = ip_address }
        else { ctx.request.body.author = authorized_id; }

        // Check if voted before, and count votes, get the current joke
        let current_joke = await strapi.services.jokes.findOne({id: joke_id});
        // Loop through votes to see IP or user ID
        
        for(const vote of current_joke.votes){ 
            if(!authorized_id && authorized_id.role.name != "Administrator"){
                if(vote.ip_address == ip_address) ctx.throw(400, 'Already voted, same ip');
                if(vote.author && vote.author == authorized_id.id) ctx.throw(400, 'Already voted, same author');
            }
    
            if(vote.value == "up") votes_up++;
            if(vote.value == "down") votes_down++;
        }
        
        
        
        // Make the vote
        let vote = await strapi.services.votes.create(ctx.request.body);
        
        // Vote registered, but not linked to a joke
        // Get Current joke Votes to Append to Joke.votes
        let current_votes = current_joke.votes.map(elem =>{
            return elem.id;
        });

        
        // Check if status needs to be changed based on this vote
        let status = current_joke.status;
        // Change status only if it was pending, if jokes vote count exceeds threshold, make public or delete
        if(current_joke.status == 'pending'){
            if(votes_up >= threshold){
                status = "active";
            }
            else if(votes_down >= threshold){
                status = "deleted";
            }
            
            // Force change status of joke to approved or deleted for admin users
            if(authorized_id && authorized_id.role.name == "Administrator"){
                if(vote_value =="up") status = "active";
                if(vote_value =="down") status = "deleted";
                console.log(vote_value);
                console.log(`it was an admin and status ${status} was forced`)
                current_joke.remarks += " ## " + `forced ${status} by administrator ${authorized_id.username}`;
            }
            // Prepare for a remarks entry update
            current_joke.remarks += " ## " + `the vote is ${vote.value}, total ups: ${votes_up}, total downs:  ${votes_down}, threshold is: ${threshold}, status should be:  ${status} at: ${Date.now()}`;
        }

        // Add to Joke
        let make_vote = await strapi.query('jokes').update({id: joke_id},{
            "status": status, 
            "votes":[...current_votes, vote.id],
            "remarks": current_joke.remarks
        });

        // remove ip address info for response
        make_vote.votes.map(elem =>{
            elem.ip_address = undefined;
        })
        
        return sanitizeEntity(make_vote, { model: strapi.models.jokes });
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