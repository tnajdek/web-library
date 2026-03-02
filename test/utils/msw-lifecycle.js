export function setupMSWLifecycle(server) {
	const unhandledRequests = [];

	beforeAll(() => {
		server.listen({
			onUnhandledRequest: (req, print) => {
				unhandledRequests.push(`${req.method} ${req.url}`);
				print.error();
			},
		});
	});

	afterEach(() => {
		server.resetHandlers();
		try {
			expect(unhandledRequests).toEqual([]);
		} finally {
			unhandledRequests.length = 0;
		}
	});

	afterAll(() => server.close());
}
