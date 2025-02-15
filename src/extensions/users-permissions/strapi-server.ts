// ./src/extensions/users-permissions/strapi-server.ts

export default (plugin: any) => {
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
  
    return plugin;
  };