FROM node:lts

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 1080

CMD ["node", "src/start.js"]