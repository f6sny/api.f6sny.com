//const slug = require('slugify');
const allowed_characters_regex = /[^- \\\\1234567890أبجدهوزحطيكلمنسعفصقرشتثخذضظغلاإآؤئءىةاabcdefghijklmnopqrstuvwxyz.\\+!#\\?]/g;

function strip_tags_and_new_lines(text) {
    if (!text) return false;
    text = text.toString();
    return text.replace(/<\/?[^>]+>|[\r\n]/g, '');
}

function shorten(text, maxLen, separator = ' ') {
    if (text.length <= maxLen) return text;
    if (typeof separator !== 'string' || separator.length === 0) {
        throw new Error('Invalid separator argument: must be a non-empty string');
    }
    return text.substr(0, text.lastIndexOf(separator, maxLen));
}


export default {

    clean_adult_content(jokes_array, adult_selection) {
        if (!adult_selection) {
            jokes_array = jokes_array.filter(elem => {
                let visibile = true;

                elem.tags.forEach(element => {
                    if (element.adult_content) {
                        visibile = false;
                        return;
                    }
                });

                if (!visibile) return undefined;
                else return elem;
            })
        }
        return jokes_array;
    },

    async filter_array(arr, callback) {
        const fail = Symbol()
        return (await Promise.all(arr.map(async item => (await callback(item)) ? item : fail))).filter(i => i !== fail)
    },

    generate_slug(text) {
        text = strip_tags_and_new_lines(text);
        text = text.replace(/ +(?= )/g, '');
        text = text.trim();
        text = text.replace("يقول لك", "");
        text = text.replace(allowed_characters_regex, "");
        text = text.trim();
        text = shorten(text, 50).trim().replace(/[" "]/g, "-");
        return text
    },

}