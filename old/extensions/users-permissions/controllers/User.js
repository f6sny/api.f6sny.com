const { sanitizeEntity } = require("strapi-utils");

module.exports = {
  /**
   * Retrieve user records.
   * @return {Object|Array}
   */
  async findByUsername(ctx) {
    const { username } = ctx.params;
    
    const entity = await strapi.query('user', 'users-permissions').findOne({ username: username });
    if(entity.jokes){entity.jokes = entity.jokes.length;}
      
    return sanitizeEntity(entity, { model: strapi.query("user", "users-permissions").model });
  }
};
