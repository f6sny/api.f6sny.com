'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const slug = require('slugify');

const strip_tags_and_new_lines = (str) =>{
    if ((str===null) || (str==='')) 
        return false; 
    else
        str = str.toString();     
    // remove html tags
    str = str.replace( /(<([^>]+)>)/ig, '');
    // remove all new lines
    str = str.replace( /\r?\n|\r/g, '');
    return str;
};

const shorten = (str, maxLen, separator = ' ') => {
    if (str.length <= maxLen) return str;
    return str.substr(0, str.lastIndexOf(separator, maxLen));
};
const regex = /[^- 1234567890أبجدهوزحطيكلمنسعفصقرشتثخذضظغلاإآؤئءىةاabcdefghijklmnopqrstuvwxyz.]/g;
module.exports = {
    
    lifecycles: {
      beforeCreate: async (data) => {    
        if (data.content) {
            let slug = strip_tags_and_new_lines(data.content);
            slug = slug.replace(/ +(?= )/g,'');
            slug = slug.trim();
            slug = slug.replace("يقول لك","");
            slug = slug.replace(regex, "");
            slug = slug.trim();
            slug = shorten(slug, 50).trip().replace(/[" "]/g, "-");
            data.slug = slug
        }
      },
      beforeUpdate: async (params, data) => {
        if (data.content) {
            let slug = strip_tags_and_new_lines(data.content);
            slug = slug.replace(/ +(?= )/g,'');
            slug = slug.trim();
            slug = slug.replace("يقول لك","");
            slug = slug.replace(regex, "");
            slug = slug.trim();
            slug = shorten(slug, 50).trip().replace(/[" "]/g, "-");
            data.slug = slug
        }
      },
    },
  };
  
