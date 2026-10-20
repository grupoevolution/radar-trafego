# Dockerfile — Radar (Node 20 em Alpine, usuário não-root)
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY . .
RUN chown -R node:node /app
USER node

ENV PORT=3200
EXPOSE 3200

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||3200)+'/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
