FROM node:24-slim AS base
WORKDIR /app
COPY package*.json ./

FROM base AS development

RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm install
COPY . .
RUN npm run build

FROM base AS production
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY src/templates ./src/templates
EXPOSE 3001
CMD ["npm", "start"]