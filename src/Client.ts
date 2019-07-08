import { Amqp } from '@spectacles/brokers';
import Koa = require('koa');
import Router = require('koa-router');
import bodyParser = require('koa-bodyparser');
import Lavaqueue from 'lavaqueue';
import players from './routes/players';
import tracks from './routes/tracks';
import { Dispatch } from '@spectacles/types';

export interface ClientOptions {
	lavaqueue: Lavaqueue,
}

export default class Client {
	public readonly lavalink: Lavaqueue;

	constructor(options: ClientOptions) {
		this.lavalink = options.lavaqueue;
	}

	public registerRoutes(app: Koa) {
		app.use(bodyParser());

		const router = new Router({
			prefix: '/v1',
		});

		const playerRouter = players.call(this);
		router.use('/players', playerRouter.routes(), playerRouter.allowedMethods());

		const trackRouter = tracks.call(this);
		router.use('/tracks', trackRouter.routes(), trackRouter.allowedMethods());

		app.use(router.middleware());
	}

	public async registerListeners(broker: Amqp) {
		await broker.subscribe([
			Dispatch.VOICE_STATE_UPDATE,
			Dispatch.VOICE_SERVER_UPDATE,
		], (event, data) => {
			console.log(event, data);
			switch (event) {
				case Dispatch.VOICE_STATE_UPDATE:
					this.lavalink.voiceStateUpdate(data);
					break;
				case Dispatch.VOICE_SERVER_UPDATE:
					this.lavalink.voiceServerUpdate(data);
					break;
			}
		});
	}
}
