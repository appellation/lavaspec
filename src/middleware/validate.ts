import { validate, SchemaLike, ValidationError } from '@hapi/joi';
import { Context, Request } from 'koa';

export default <K extends keyof Request>(
	prop: K,
	schema: SchemaLike,
	errorHandler: (err: ValidationError, ctx: Context, next: () => Promise<void>) => void = (err: ValidationError, ctx: Context) => {
		ctx.status = 400;
		ctx.body = err.message;
	},
) => async function(ctx: Context, next: () => Promise<void>) {
	const result = validate(ctx.request[prop], schema);
	if (result.error) {
		errorHandler(result.error, ctx, next);
	} else {
		ctx.request[prop] = await result;
		await next();
	}
};
