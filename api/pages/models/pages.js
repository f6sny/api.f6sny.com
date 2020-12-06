'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

module.exports = {
    beforeSave: async (model, attrs, options) => {
      if (options.method === 'insert' && attrs.title) {
        model.set('slug', slugify(attrs.title, {lower: true}));
      } else if (options.method === 'update' && attrs.title) {
        attrs.slug = slugify(attrs.title, {lower: true});
      }
    },
  };
  