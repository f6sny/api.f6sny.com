# Reference: https://pnpm.io/docker#example-1-build-a-bundle-in-a-docker-container

FROM node:18-slim AS base

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    libvips-dev \
    build-essential \
    python3
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
COPY . /app
WORKDIR /app

FROM base AS prod-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i -P --frozen-lockfile

FROM base AS build
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm i --frozen-lockfile
RUN pnpm build

FROM base
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Rebuild Sharp for the current environment
RUN cd /app && npm rebuild sharp --platform=linux --arch=x64
EXPOSE 1337
CMD ["npm", "start"]