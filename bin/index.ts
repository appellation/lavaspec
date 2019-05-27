import Koa = require('koa');
import logger = require('koa-logger');
import { Amqp } from '@spectacles/brokers';
import Redis = require('ioredis');
import Client from '../src/Client';

const broker = new Amqp(process.env.BROKER_GROUP || 'gateway');
const app = new Koa();
const c = new Client({
	lavalink: {
		password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
		userID: process.env.DISCORD_USER_ID || '218844420613734401',
		hosts: {
			redis: new Redis(process.env.REDIS_HOST),
			rest: process.env.LAVALINK_REST || 'http://lavalink:8080',
			ws: process.env.LAVALINK_WS || 'ws://lavalink:8080',
		},
	},
	broker,
});

broker.connect(process.env.AMQP_HOST || 'amqp://rabbit').then(() => {
	c.registerListeners(broker);
});

if (process.env.NODE_ENV !== 'production') app.use(logger());
c.registerRoutes(app);

app.listen(process.env.PORT || 3000);
console.log('listening');
