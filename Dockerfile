FROM node:alpine

ADD package.json yarn.lock ./
RUN yarn install
ADD . .
CMD ["yarn", "start"]
