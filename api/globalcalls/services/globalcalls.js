'use strict';

module.exports = {
    async isAdultJoke(joke_id){
        // get the joke object
        let istrue = false;
        let joke = await strapi.services.jokes.findOne({id: joke_id});
        for(const tag of joke.tags){
            if(tag.adult_content == true)  {
                istrue = true;
            }
        }
        return istrue;
    },

    clean_arabic(string){
        return;
    },
    clean_adult_content(jokes_array,adult_selection) {
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
    }
};
