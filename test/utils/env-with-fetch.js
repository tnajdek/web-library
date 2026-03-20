import { TestEnvironment } from 'jest-environment-jsdom';

// based on https://github.com/jsdom/jsdom/issues/1724#issuecomment-1446858041
class FetchEnvironment extends TestEnvironment {
	constructor(...args) {
		super(...args);

		// Node's fetch/Response create objects (arrays, plain objects) using Node's
		// built-in constructors, which are different objects from jsdom's constructors.
		// This causes constructor-identity checks (e.g., fast-deep-equal's
		// `a.constructor !== b.constructor`) to fail for structurally identical data.
		// Wrapping Response.json() to re-parse in the jsdom realm ensures all parsed
		// data uses the same constructors as application code running in jsdom.
		const jsdomParse = this.global.JSON.parse;
		const NodeResponse = Response;
		this.global.Response = class extends NodeResponse {
			async json() {
				return jsdomParse(await super.text());
			}
		};

		this.global.fetch = fetch;
		this.global.Headers = Headers;
		this.global.Request = Request;
		this.global.AbortController = AbortController;
		this.global.AbortSignal = AbortSignal;
		this.global.TransformStream = TransformStream;
		this.global.ReadableStream = ReadableStream;
		this.global.WritableStream = WritableStream;
		this.global.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
		this.global.CountQueuingStrategy = CountQueuingStrategy;
		this.global.BroadcastChannel = BroadcastChannel;
		this.global.jsdom = this.dom;
	}
}

export default FetchEnvironment;
