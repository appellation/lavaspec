FROM node:alpine

RUN apk update && apk upgrade \
	&& apk add --virtual .build-deps build-base python
ADD package.json yarn.lock ./
RUN yarn install
RUN apk del .build-deps
ADD . .
CMD ["yarn", "start"]
