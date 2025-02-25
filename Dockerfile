# Creating multi-stage build for production
FROM node:18-alpine as build
RUN apk update && apk add --no-cache build-base gcc autoconf automake zlib-dev libpng-dev vips-dev git > /dev/null 2>&1
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG PACKAGE_MANAGER=pnpm

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /opt/
COPY package.json pnpm-lock.yaml* ./
RUN ${PACKAGE_MANAGER} install -g node-gyp
# Install dependencies
RUN ${PACKAGE_MANAGER} install --frozen-lockfile --prod
ENV PATH=/opt/node_modules/.bin:$PATH
WORKDIR /opt/app
COPY . .
RUN ${PACKAGE_MANAGER} run build

# Creating final production image
FROM node:18-alpine
RUN apk add --no-cache vips-dev
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ARG PACKAGE_MANAGER=pnpm

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /opt/
COPY --from=build /opt/node_modules ./node_modules
WORKDIR /opt/app
COPY --from=build /opt/app ./
ENV PATH=/opt/node_modules/.bin:$PATH

RUN chown -R node:node /opt/app
USER node
EXPOSE 1337
CMD ["pnpm", "run", "start"]