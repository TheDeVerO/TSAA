const tmi = require('tmi.js');
const fs = require('fs');
const http = require('http');
const WebSocketServer = require('websocket').server;

const getFiles = require('./get-files');

const files = getFiles();
const commands = {};

var wsServer;

files.forEach((file) => {
	if (typeof file === 'object' && file !== null) {
		commands[file.command] = {
			callback: function callback() {
				const rand = Math.random() * file.files.length - 1;
				if (rand < 0) {
					console.warn(`It is recommended to have at least two files in the ${file.command} directory`);
					playSound(`${file.command}/${file.files[0]}`);
				} else {
					playSound(`${file.command}/${file.files[Math.round(rand)]}`);
				}
			},
		};
	} else {
		commandName = file.split('.').slice(0, -1).join('.');
		commands[commandName] = {
			callback: function callback() {
				console.log(file);
				playSound(`${file}`);
			},
		};
	}
});

const tmiClient = new tmi.Client({
	connection: { secure: true, reconnect: true },
	channels: ['angysaoirse', 'the_devero'],
});

tmiClient.connect();
createServer();

function createServer() {
	const PORT = 8082;

	fs.readFile('./index.html', function (err, html) {
		if (err) console.log(err);
		const httpServer = http
			.createServer(function (req, res) {
				if (req.url === '/') {
					console.log(`Homepage requested.`);
					res.writeHead(200, { 'Content-Type': 'text/html' }).write(html);
				} else if (req.url.startsWith('/resources')) {
					console.log(`Resources requested.`);
					console.log(`Looking for ${req.url}...`);
					if (fs.existsSync(__dirname + req.url)) {
						console.log(`Found. Uploading...`);
						const readStream = fs.createReadStream(__dirname + req.url);
						res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
						readStream.pipe(res);
					}
				}
			})
			.listen(PORT, () => {
				console.log(`Server running on ${PORT}...`);
			});

		wsServer = new WebSocketServer({
			httpServer: httpServer,
		});

		wsServer.on('connect', () => {
			console.log('Web Socket Server is connected.');
		});

		wsServer.on('request', (request) => {
			console.log(`Web Socket Server received a request. (Currently I'm accepting it without checks.)`);
			var connection = request.accept();

			connection.on('message', (data) => {
				console.log('Got a message.');
				console.log(data);
				console.warn('Current API does not expect nor supports socket requests.');
			});
			connection.on('close', () => {
				console.warn(`Connection closed.`);
			});
		});
	});
}

tmiClient.on('message', (channel, tags, message, self) => {
	if (self) return;
	if (!message.startsWith('!')) return;

	console.log('tmiClient received a command message.');

	const sound = message.substring(1);
	console.log(`Received command: [${sound}].`);

	try {
		commands[sound].callback();
	} catch (error) {
		console.error(error.message);
		console.log('No such command found.');
	}
});

function playSound(path) {
	if (wsServer.connections.length < 0) {
		console.warn('WARNING! No connections. Your streaming software is most likely not capturing sound.');
		console.warn(`Are you sure you've added http://localhost:8082/ as browser source?`);
		console.warn(`If the issue persists, DM me about it.`);
		return;
	}
	wsServer.connections[0]?.send(path);
}
