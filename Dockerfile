FROM node:lts-alpine
RUN apk add --no-cache --virtual .gyp python3 make g++

WORKDIR /app

RUN mkdir -p /usr/app

WORKDIR /usr/app

COPY package.json /usr/app
#COPY package-lock.json /usr/app

RUN apk add --no-cache git

RUN npm install --force

RUN npm install -g nodemon
RUN npm install forever -g

COPY ./build /usr/app

EXPOSE 3000

#CMD ["nodemon", "index.js"]
CMD ["forever", "index.js"]