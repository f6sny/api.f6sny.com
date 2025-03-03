// ./src/extensions/users-permissions/strapi-server.ts

const _ = require('lodash');
import * as importedHooks from './content-types/user/lifecycles';

// Create default empty hook functions
const hooks = {
  beforeCreate: async (ctx) => {},
  afterCreate: async (ctx) => {},
  beforeUpdate: async (ctx) => {},
  afterUpdate: async (ctx) => {},
  beforeFind: async (ctx) => {},
  afterFind: async (ctx) => {},
  beforeFindOne: async (ctx) => {},
  afterFindOne: async (ctx) => {},
  beforeCount: async (ctx) => {},
  afterCount: async (ctx) => {},
  beforeDestroy: async (ctx) => {},
  afterDestroy: async (ctx) => {},
  beforeMe: async (ctx) => {},
  afterMe: async (ctx) => {},
  ...importedHooks // Override with any hooks that are actually defined
};

export default (plugin: any) => {
  const controllers = plugin.controllers.user;
  const methods = ['create', 'update', 'find', 'findOne', 'count', 'destroy', 'me'];

  plugin.controllers.user.find = async (ctx) => {
    const { query } = ctx;

    // Extract pagination parameters with Strapi v5 defaults
    const { page = 1, pageSize = 25, start, limit } = query;

    // Build the query options using Strapi v5 format
    const queryOptions = {
      ...query,
      pagination: {
        pageSize: parseInt(String(pageSize)),
        page: parseInt(String(page)),
        // Support both page/pageSize and start/limit
        ...(start !== undefined && limit !== undefined ? { start, limit } : {})
      }
    };

    try {
      // Use entityService for consistent behavior
      const { results, pagination } = await strapi.entityService.findPage('plugin::users-permissions.user', queryOptions);

      // Sanitize users for response
      const sanitizedUsers = results.map(user => {
        const { password, resetPasswordToken, confirmationToken, ...sanitizedUser } = user;
        return sanitizedUser;
      });

      // Return in Strapi v5's standard format
      ctx.body = {
        data: sanitizedUsers,
        meta: {
          pagination: {
            page: pagination.page,
            pageSize: pagination.pageSize,
            pageCount: pagination.pageCount,
            total: pagination.total
          }
        }
      };
    } catch (error) {
      ctx.throw(500, error);
    }
  };

  for (const method of methods) {
    const oldMethod = controllers[method];

    controllers[method] = async (ctx) => {
      // Call the before hook if it exists
      await hooks[`before${method[0].toUpperCase() + method.slice(1)}`](ctx);
      // Call the original method
      const result = await oldMethod(ctx);
      // Call the after hook if it exists
      await hooks[`after${method[0].toUpperCase() + method.slice(1)}`](ctx);
      return result;
    };
  }

  return plugin;
};