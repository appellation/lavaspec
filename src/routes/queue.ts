import * as Joi from '@hapi/joi';
import * as Router from 'koa-router';
import Client from '../Client';
import validate from '../middleware/validate';
import { PlayerContext } from './players';

export default function(this: Client): Router {
	const router = new Router();

	router.get('/', validate('query', Joi.object({
			start: Joi.number().integer().positive().default(0),
			end: Joi.number().integer().greater(Joi.ref('start')).default(10),
		})), async (ctx: PlayerContext) => {
			const {
				query: { start, end },
				state: { queue },
			} = ctx;

			const tracks = await queue.tracks(start, end);
			ctx.body = await this.lavalink.decode(tracks);
		},
	);

	router.put('/', validate('body', Joi.object({
		tracks: Joi.array().items(Joi.string()).default([]),
		position: Joi.number().integer().default(-1),
		deleteCount: Joi.number().positive().integer().default(0),
		start: Joi.bool().default(false),
	})), async (ctx: PlayerContext) => {
		const {
			state: { queue },
			request: { body },
		} = ctx;

		if (body.position != -1) {
			await queue.splice(body.position, body.deleteCount, ...body.tracks);
		} else {
			await queue.add(...body.tracks);
		}

		if (body.start) await queue.start();
		ctx.status = 200;
	});

	router.delete('/', (ctx: PlayerContext) => {
		ctx.state.queue.clear();
		ctx.status = 200;
	});

	router.get('/:index', validate('query', Joi.object({
			index: Joi.alternatives().try([
				Joi.string().only('current'),
				Joi.number().positive().integer(),
			]),
		})), async (ctx: PlayerContext) => {
			const {
				state: { queue },
				params: { index },
			} = ctx;
			let track: string | null;

			if (index === 'current') {
				const np = await queue.current();
				track = np && np.track;
			} else {
				[track] = await queue.tracks(index, index + 1);
			}

			if (!track) {
				ctx.status = 404;
				return;
			}

			ctx.body = await this.lavalink.decode(track);
		}
	);

	return router;
}
