FROM node:24.7.0-bookworm-slim AS build
WORKDIR /workspace
RUN corepack enable
COPY .npmrc package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig*.json ./
COPY apps/api apps/api
RUN pnpm install --frozen-lockfile --filter @siromix/api...
RUN pnpm --filter @siromix/api build
RUN pnpm --filter @siromix/api deploy --prod --legacy /prod/api

FROM node:24.7.0-bookworm-slim AS runtime
ARG SOURCE_COMMIT=unknown
LABEL org.opencontainers.image.revision=$SOURCE_COMMIT
RUN apt-get update && apt-get upgrade -y \
    && rm -rf /var/lib/apt/lists/* /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx
WORKDIR /app
ENV NODE_ENV=production
ENV SOURCE_COMMIT=$SOURCE_COMMIT
COPY --from=build --chown=node:node /prod/api ./
COPY --from=build --chown=node:node /workspace/apps/api/dist ./dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3001/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "dist/src/main.js"]
