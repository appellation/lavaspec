import * as Joi from '@hapi/joi';
import * as Router from 'koa-router';
import { LoadType } from 'lavalink';
import Client from '../Client';
import validate from '../middleware/validate';
import { URL } from 'url';

export default function(this: Client): Router {
	const router = new Router();

	router.get('/load', validate('query', Joi.object({ q: Joi.string().required() })), async (ctx) => {
		let q = ctx.request.query.q;
		try {
			new URL(q);
		} catch {
			q = `ytsearch:${q}`;
		}

		const res = await this.lavalink.load(q);
		switch (res.loadType) {
			case LoadType.LOAD_FAILED:
				ctx.status = 500;
				return;
			case LoadType.NO_MATCHES:
				ctx.body = [];
				return;
			case LoadType.SEARCH_RESULT:
			case LoadType.TRACK_LOADED:
			case LoadType.PLAYLIST_LOADED:
				ctx.body = res.tracks;
				return;
		}
	});

	return router;
}
