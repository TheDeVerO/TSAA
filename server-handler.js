const http = require('http');
const fs = require('fs');
const WebSocketServer = require('websocket').server;

const PORT = 8082;
function createServer() {
	fs.readFile('./index.html', function (err, html) {
		if (err) console.log(err);
		const httpServer = http
			.createServer(function (req, res) {
				console.log('got a request');
				console.log(req.url);
				if (req.url === '/') {
					console.log(`it's a home url`);
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.write(html);

					res.end();
				} else if (req.url.startsWith('/resources')) {
					console.log(`it's a resources req`);
					if (fs.existsSync(__dirname + req.url)) {
						const readStream = fs.createReadStream(__dirname + req.url);
						res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
						readStream.pipe(res);
					}
				}
			})
			.listen(PORT, () => {
				console.log('Server running on ' + PORT);
			});

		const wsServer = new WebSocketServer({
			httpServer: httpServer,
		});

		return wsServer;

		wsServer.on('connect', () => {
			console.log('WsServer connected');
		});

		wsServer.on('request', (request) => {
			console.log(`got a request`);

			var connection = request.accept();

			connection.on('message', (data) => {
				console.log('got a message.');
				console.log(data);
				connection.send('bruh');
			});
			connection.on('close', () => {
				console.log(`Connection closed.`);
			});
		});
	});
}

module.exports = createServer;
