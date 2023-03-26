"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/models.html#lifecycle-hooks)
 * to customize this model
 */

const { generate_slug } = require("../../../utilities/mfo_tools");

module.exports = {
  lifecycles: {
    beforeCreate: async (data) => {
      if (data.content) {
        data.slug = generate_slug(data.content);
      }
    },
    beforeUpdate: async (params, data) => {
      if (data.content) {
        data.slug = generate_slug(data.content);
      }
    },
  },
};
