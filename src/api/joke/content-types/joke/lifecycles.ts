export default {
    beforeCreate(event) {
      const { data, where, select, populate } = event.params;

      if (data.content) {
        data.slug = strapi.service("api::globalcall.globalcall").generate_slug(data.content);
      }

    },
  
    beforeUpdate(event) {
        const { data, where, select, populate } = event.params;
        if (data.content) {
            data.slug = strapi.service("api::globalcall.globalcall").generate_slug(data.content);
          }
    },
  };
  
  