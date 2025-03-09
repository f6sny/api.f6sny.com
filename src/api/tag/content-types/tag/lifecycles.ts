export default {
    beforeCreate(event) {
      const { data } = event.params;

      if (data.title) {
        data.slug = strapi.service("api::globalcall.globalcall").generate_slug(data.title);
      }

    },
  
    beforeUpdate(event) {
        const { data } = event.params;
        if (data.title) {
            data.slug = strapi.service("api::globalcall.globalcall").generate_slug(data.title);
          }
    },
  };
  
  