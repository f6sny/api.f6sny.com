// make an update method for current user
// if not authenticated return 401
// if authenticated update the user
// return the updated user
// protect the main properties from being updated

export default {
    async update(ctx) {
        const { user } = ctx.state;
        if (!user) {
            return ctx.unauthorized('You are not authenticated');
        }
        const { data } = ctx.request.body;
        // protect the main properties from being updated
        // lets keep everything in data, but remove critical fields
        if(data.confirmed) {
            delete data.confirmed;
        }
        if(data.blocked) {
            delete data.blocked;
        }
        if(data.role) {
            delete data.role;
        }
        if(data.createdAt) {
            delete data.createdAt;
        }
        if(data.updatedAt) {
            delete data.updatedAt;
        }
        if(data.id) {
            delete data.id;
        }
        if(data.documentId) {   
            delete data.documentId;
        }
        if(data.provider) {
            delete data.provider;
        }

        

        console.log(data)

        
        
        const updatedUser = await strapi.entityService.update('plugin::users-permissions.user', user.id, {
            data: data
        });
        return updatedUser;
    }
}

