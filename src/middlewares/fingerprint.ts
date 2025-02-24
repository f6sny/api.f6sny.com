import crypto from 'crypto';


export default (config, { strapi }) => {
  return async (ctx, next) => {
    const components = {
      ip: ctx.request.ip,
      ua: ctx.get('user-agent') || '',
      lang: ctx.get('accept-language') || '',
      encoding: ctx.get('accept-encoding') || '',
      secChUa: ctx.get('sec-ch-ua') || '',
      secChUaMobile: ctx.get('sec-ch-ua-mobile') || '',
      secChUaPlatform: ctx.get('sec-ch-ua-platform') || '',
    };

    const fingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(components))
      .digest('hex');

    ctx.state.fingerprint = fingerprint;
    
    await next();
  };
};

