FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
EXPOSE 3000
# Same image runs the API (default) or the email worker (`node src/worker.js`)
CMD ["node", "src/index.js"]
