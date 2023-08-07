FROM node:18

WORKDIR /monas2

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "npm", "start" ]