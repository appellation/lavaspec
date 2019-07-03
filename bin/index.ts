#!/usr/bin/node
import Koa = require('koa');
import logger = require('koa-logger');
import { Amqp } from '@spectacles/brokers';
import Redis = require('ioredis');
import Lavaqueue from 'lavaqueue';
import Client from '../src/Client';

const broker = new Amqp(process.env.BROKER_GROUP || 'gateway');
const app = new Koa();
const lavaqueue = new Lavaqueue({
	password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
	userID: process.env.DISCORD_USER_ID || '218844420613734401',
	hosts: {
		redis: new Redis(process.env.REDIS_HOST || 'redis://redis'),
		rest: process.env.LAVALINK_REST || 'http://lavalink:2333',
		ws: process.env.LAVALINK_WS || 'ws://lavalink:2333',
	},
	send: (guildID: string, packet: any) => broker.publish('SEND', {
		guild_id: guildID,
		packet,
	}),
});
const c = new Client({ lavaqueue });

broker.on('close', console.warn);

broker.connect(process.env.AMQP_HOST || 'rabbit')
	.then(() => c.registerListeners(broker));

if (process.env.NODE_ENV !== 'production') app.use(logger());
c.registerRoutes(app);

app.listen(process.env.PORT || 3000);
console.log('listening');
