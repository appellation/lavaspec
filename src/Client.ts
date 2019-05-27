import { Amqp } from '@spectacles/brokers';
import Koa = require('koa');
import Router = require('koa-router');
import bodyParser = require('koa-bodyparser');
import Lavaqueue, { Options as LavaqueueOptions } from 'lavaqueue';
import players from './routes/players';
import tracks from './routes/tracks';
import { Dispatch } from '@spectacles/types';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interface ClientOptions {
	lavalink: Omit<LavaqueueOptions, 'send'>,
	broker: Amqp,
}

export default class Client {
	public readonly lavalink: Lavaqueue;

	constructor(options: ClientOptions) {
		const llOpts: LavaqueueOptions = {
			...options.lavalink,
			send: (guildID: string, packet: any) => {
				return options.broker.publish('SEND', {
					guild_id: guildID,
					packet,
				});
			},
		};

		this.lavalink = new Lavaqueue(llOpts);
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
			switch (event) {
				case Dispatch.VOICE_STATE_UPDATE:
					this.lavalink.voiceStateUpdate(data);
				case Dispatch.VOICE_SERVER_UPDATE:
					this.lavalink.voiceServerUpdate(data);
			}
		});
	}
}
