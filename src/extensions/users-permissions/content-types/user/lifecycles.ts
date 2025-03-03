import '@strapi/strapi';

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
