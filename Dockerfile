# docker run  --name f6sny-strapi -e NODE_ENV=production  -p 8010:80 --rm -it strapi-f6sny ash
FROM node:12-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
RUN npm install
COPY . /usr/src/app
RUN npm run build
ENV PORT 80
EXPOSE ${PORT}
CMD [ "npm","run", "start" ]