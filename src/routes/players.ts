import * as Router from 'koa-router';
import * as Joi from '@hapi/joi';
import { Player } from 'lavalink';
import { Queue } from 'lavaqueue';
import { decodeTrack } from 'lavaplayer-track-info';
import Client from '../Client';
import queues from './queue';
import validate from '../middleware/validate';
import { ParameterizedContext } from 'koa';

export enum PlayerStatus {
	PLAYING,
	PAUSED,
	STOPPED,
}

export type PlayerContext<T = any> = ParameterizedContext<{ player: Player, queue: Queue }, T>;

export default function(this: Client): Router {
	const router = new Router();

	router.param('guildID', async (id, ctx, next) => {
		if (!this.lavalink.players.has(id) || !this.lavalink.queues.has(id)) {
			switch (ctx.method) {
			case 'GET':
				ctx.status = 404;
				return;
			case 'PUT':
			case 'POST':
				break;
			case 'DELETE':
				ctx.status = 204;
				return;
			default:
				return;
			}
		}

		ctx.state.player = this.lavalink.players.get(id);
		ctx.state.queue = this.lavalink.queues.get(id);
		await next();
	});

	router.get('/', (ctx) => {
		ctx.body = [...this.lavalink.players.keys()];
	});

	router.get('/:guildID', (ctx: PlayerContext) => {
		ctx.body = { status: ctx.state.player.status };
	});

	router.put(
		'/:guildID',
		validate('body', Joi.object({
			track: Joi.string(),
			status: Joi.number().allow(...Object.values(PlayerStatus)).default(PlayerStatus.PLAYING),
			channelID: Joi.string().regex(/^\d{17,20}$/),
		})),
		async (ctx: PlayerContext) => {
			const {
				request: { body },
				state: {
					player,
					queue,
				},
			} = ctx;

			switch (body.status) {
			case PlayerStatus.PLAYING: {
				if (body.channelID) await player.join(body.channelID);

				if (body.track) {
					try {
						decodeTrack(body.track);
					} catch {
						ctx.status = 400;
						return;
					}

					await player.play(body.track);
					break;
				}

				if (player.paused) {
					await player.pause(false);
					break;
				}

				const np = await queue.current();
				if (!np) {
					ctx.status = 418;
					return;
				}

				await player.play(np.track);
			}
			case PlayerStatus.PAUSED:
				await player.pause();
				break;
			case PlayerStatus.STOPPED:
				await player.stop();
				break;
			}

			ctx.status = 204;
		},
	);

	router.delete('/:guildID', async (ctx: PlayerContext) => {
		await ctx.state.player.destroy();
		ctx.status = 204;
	});

	const queueRouter = queues.call(this);
	router.use('/:guildID/queue', queueRouter.routes(), queueRouter.allowedMethods());
	return router;
}
