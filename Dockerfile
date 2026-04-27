FROM node:20-alpine

WORKDIR /app/server

COPY server/package.json ./
RUN npm install --omit=dev

COPY server/ ./
COPY html/ /app/html/

ENV NODE_ENV=production
ENV PORT=3000
ENV STATIC_DIR=/app/html

EXPOSE 3000

CMD ["npm", "start"]
