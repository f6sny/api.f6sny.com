# docker run -d --name f6sny-strapi -p 8010:80 --rm -it strapi-f6sny
FROM node:14-alpine
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY package.json /usr/src/app/
ENV NODE_ENV="production"
RUN npm install
COPY . /usr/src/app
RUN npm run build
ENV PORT 80
EXPOSE ${PORT}
CMD [ "npm","run", "start" ]