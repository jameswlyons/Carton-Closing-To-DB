FROM node:lts-alpine

WORKDIR /app

RUN apk update && apk add --no-cache nmap && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
    echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
    apk update && \
    apk add --no-cache \
      chromium \
      harfbuzz \
      "freetype>2.8" \
      ttf-freefont \
      nss

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

RUN mkdir -p /usr/app

WORKDIR /usr/app

COPY package.json /usr/app
#COPY package-lock.json /usr/app

RUN apk add --no-cache git

RUN npm install --force

RUN npm install -g nodemon


COPY ./build /usr/app

EXPOSE 3000

CMD ["nodemon", "index.js"]