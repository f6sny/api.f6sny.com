import { factories } from '@strapi/strapi';

export default {
    async isAdultJoke(joke_id: number) {
        // get the joke object
        let is_adult_joke = false;
        let joke = await strapi.documents('api::joke.joke').findOne({
            documentId: joke_id.toString(),
            populate: ['tags']
        });

        console.log(joke);

        joke.tags.forEach(tag => {
            if(tag.restriction == 'strict'){
                is_adult_joke = true;
            }
        });

        return is_adult_joke;
    },

    generate_slug(text: string) {
        const ALLOWED_CHARACTERS_REGEX = /[^- \\\\1234567890أبجدهوزحطيكلمنسعفصقرشتثخذضظغلاإآؤئءىةاabcdefghijklmnopqrstuvwxyz.\\+!#\\?]/g;
        const TAGS_REGEX = /<\/?[^>]+>|[\r\n]/g;
        const SOME_REGEX = / +(?= )/g;
        const strip_tags_and_new_lines = (text) => {
            return text?.toString().replace(TAGS_REGEX, '') || false;
        }
        const shorten = (text, maxLen, separator = ' ') => {
            if (text.length <= maxLen) return text;
            if (!separator) throw new Error('Invalid separator: must be a non-empty string');
            return text.substr(0, text.lastIndexOf(separator, maxLen));
        }

        text = strip_tags_and_new_lines(text) || '';
        text = text.replace(SOME_REGEX, '').trim();
        text = text.replace("يقول لك", "").replace(ALLOWED_CHARACTERS_REGEX, "").trim();
        return shorten(text, 50).trim().replace(/ /g, "-");
    },

    clean_adult_content(jokes_array: any[], adult_selection: boolean) {
        if(!adult_selection){
            jokes_array = jokes_array.filter(element => {
                let visibile = true;
                //console.log(element);
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