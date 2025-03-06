import '@strapi/strapi';

export const beforeUpdate = async (ctx) => {
    console.log('beforeUpdate');
    console.log(ctx.request.body.date_of_birth);

    if(ctx.request.body.date_of_birth == "") {
        ctx.request.body.date_of_birth = null;
    }

    // return the query
    return ctx;
};


export const beforeFindOne = async (ctx) => {
    console.log('beforeFindOne');

    // add populate to query
    ctx.query.populate = ['avatar'];

    // return the query
    return ctx;
};


export const beforeFind = async (ctx) => {
    console.log('beforeFind');

    // add populate to query
    ctx.query.populate = ['avatar'];

    // return the query
    return ctx;
};
