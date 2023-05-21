'use strict';

module.exports = {
    async isAdultJoke(joke_id){
        // get the joke object
        let is_adult_joke = false;
        let joke = await strapi.services.jokes.findOne({id: joke_id});

        joke.tags.forEach(tag => {
            if(tag.adult_content == true){
                is_adult_joke = true;
            }
        });

        return is_adult_joke;
    },

    clean_arabic(string){
        return;
    },

    clean_adult_content(jokes_array,adult_selection) {
        if(!adult_selection){
            jokes_array = jokes_array.filter(element => {
                let visibile = true;

                element.tags.forEach(tag => {
                    if(tag.adult_content) {
                        visibile = false;
                        return;
                    }
                });
           
                if(!visibile) return undefined;
                else return element;
              })
        }
        return jokes_array;
    }
};
