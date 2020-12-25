'use strict';

/**
 * `globalcalls` service.
 */

module.exports = {
    async isAdultJoke(joke_id){
        // get the joke object
        let istrue = false;
        let joke = await strapi.services.jokes.findOne({id: joke_id});
        for(const tag of joke.tags){
            console.log(tag.adult_content)
            if(tag.adult_content == true)  {
                istrue = true;
            }
        }
        console.log(istrue);
        return istrue;
    }
};
