export default {
    async isAdultJoke(joke_id: number){
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

    clean_adult_content(jokes_array : any[], adult_selection : boolean) {
        console.log("clean_adult_content", adult_selection)
        console.log(jokes_array[0])
        
        if(!adult_selection){
            jokes_array = jokes_array.filter(element => {
                let visibile = true;
                console.log(element);
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
}