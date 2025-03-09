
export default {
  beforeFindOne(event) {
    console.log('beforeFindOne');
    // sometimes populate is an object, so we need to maintain the original structure
    if (typeof event.params.populate === 'object') {
      event.params.populate = { ...event.params.populate, 'votes': true,  'tags': true, author: { avatar: true } };
    } else {
      event.params.populate = [...(event.params.populate || []), 'votes', 'author', 'tags', 'author.avatar'];
    }
  },
  beforeFindMany(event) {
    console.log('beforeFindMany');
    // sometimes populate is an object, so we need to maintain the original structure
    if (typeof event.params.populate === 'object') {
      event.params.populate = { ...event.params.populate, 'tags': true, 'author': true, 'votes': true, 'author.avatar': true };
    } else {
      event.params.populate = [...(event.params.populate || []), 'tags', 'author', 'votes', 'author.avatar'];
    }
  },

  beforeCreate(event) {
    console.log('beforeCreate');
    if (event.params.data.content) {
      event.params.data.slug = strapi.service("api::globalcall.globalcall").generate_slug(event.params.data.content);
    }
  },

  beforeUpdate(event) {
    console.log('beforeUpdate');
    if (event.params.data.content) {
      event.params.data.slug = strapi.service("api::globalcall.globalcall").generate_slug(event.params.data.content);
    }
  },
};

