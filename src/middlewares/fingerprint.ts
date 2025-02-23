import crypto from 'crypto';


export default (config, { strapi }) => {
  return async (ctx, next) => {
    const components = {
      ip: ctx.request.ip,
      ua: ctx.get('user-agent') || '',
      lang: ctx.get('accept-language') || '',
      encoding: ctx.get('accept-encoding') || '',
      //sec-ch-ua
      secChUa: ctx.get('sec-ch-ua') || '',
      //sec-ch-ua-mobile
      secChUaMobile: ctx.get('sec-ch-ua-mobile') || '',
      //sec-ch-ua-platform
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

