const tmi = require('tmi.js');
const fs = require('fs');
const http = require('http');
const WebSocketServer = require('websocket').server;
const SysTray = require('systray').default;
const explorer = require('child_process').exec;

const getFiles = require('./get-files');
const systrayConfig = require('./systray.json');

const files = getFiles(`resources/`);
const exclusives = getFiles('exclusives/');
const systray = new SysTray(systrayConfig);

const commands = {};
const users = {};

var consoleToggle = true;
var buffer = [];
var wsServer;

exclusives.forEach((user) => {
	if (typeof user === 'object' && user !== null) {
		userName = user.split('.').slice(0, -1).join('.');
		users[userName] = {
			callback: function callback(word) {
				playSound(`exclusives/${user}/${word}`);
			},
		};
	} else {
		console.log(`Ayo, wuut daaa heeeeck brubber? You need to put ${user} file in the folder named after user nickname`);
	}
	// userName = user.split('.').slice(0, -1).join('.');
	// users[userName] = {
	// 	callback: function callback() {
	// 		playSound(`exclusives/${user}`);
	// 	},
	// };
});

files.forEach((file) => {
	if (typeof file === 'object' && file !== null) {
		commands[file.command] = {
			callback: function callback() {
				const rand = Math.random() * file.files.length - 1;
				if (rand < 0) {
					console.warn(`It is recommended to have at least two files in the ${file.command} directory`);
					playSound(`resources/${file.command}/${file.files[0]}`);
				} else {
					playSound(`resources/${file.command}/${file.files[Math.round(rand)]}`);
				}
			},
		};
	} else {
		const commandName = file.split('.').slice(0, -1).join('.');
		commands[commandName] = {
			callback: function callback() {
				playSound(`resources/${file}`);
			},
		};
	}
});

const tmiClient = new tmi.Client({
	connection: { secure: true, reconnect: true },
	channels: ['angysaoirse'],
});

tmiClient.connect();
createServer();

function createServer() {
	const PORT = 8082;

	fs.readFile('./index.html', function (err, html) {
		if (err) console.log(err);
		const httpServer = http
			.createServer(function (req, res) {
				console.log(req.url);
				if (req.url === '/') {
					console.log(`Homepage requested.`);
					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.write(html);
					res.end();
				} else if (req.url.startsWith('/resources')) {
					const path = decodeURIComponent(req.url);
					console.log(`Resources requested.`);
					console.log(`Looking for ${path}...`);
					if (fs.existsSync(__dirname + path)) {
						console.log(`Found. Uploading...`);
						const readStream = fs.createReadStream(__dirname + path);
						res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
						readStream.pipe(res);
					}
				} else if (req.url.startsWith('/exclusives')) {
					const path = decodeURIComponent(req.url);
					console.log(`Exclusives called.`);
					console.log(`Looking for ${path}...`);
					if (fs.existsSync(__dirname + path)) {
						console.log(`Found. Uploading...`);
						const readStream = fs.createReadStream(__dirname + path);
						res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
						readStream.pipe(res);
					}
				}
			})
			.listen(PORT, () => {
				console.log(`Server running on localhost:${PORT}/...`);
			});

		wsServer = new WebSocketServer({
			httpServer: httpServer,
		});

		wsServer.on('connect', () => {
			console.log('Web Socket Server is connected.');
		});

		wsServer.on('request', (request) => {
			console.log(`Web Socket Server received a request.`);

			var connection = request.accept();

			connection.on('message', (data) => {
				console.log('Connection received a message. Relaying...');
				wsServer.connections.forEach((connection) => {
					connection.send(data.utf8Data);
				});
			});
			connection.on('close', () => {
				console.warn(`Connection closed.`);
			});
		});
	});
}

tmiClient.on('message', (channel, tags, message, self) => {
	// Object.keys(users).forEach((userName) => {
	// 	if (tags['display-name'] === userName) {
	// 		users[userName].callback();
	// 	}
	// });

	if (self) return;
	if (!message.startsWith('!')) return;
	if (buffer.indexOf(tags.username) >= 0) return;

	console.log('tmiClient received a command message.');

	const sound = message.substring(1);
	console.log(`Received command: [${sound}].`);

	try {
		commands[sound].callback();
	} catch (error) {
		console.error(error.message);
		console.log('No such command found.');
	}
	cooldown(tags.username);
});

function playSound(path) {
	if (wsServer.connections.length < 0) {
		console.warn('WARNING! No connections. Your streaming software is most likely not capturing sound.');
		console.warn(`Are you sure you've added http://localhost:${PORT}/ as browser source?`);
		console.warn(`If browser source is added corretly - try selecting the source and pressing "Refresh" button.`);
		console.warn(`If the issue persists, DM me about it.`);
		return;
	}
	console.log('Sending playSound signal... Connections: ' + wsServer.connections.length);
	wsServer.connections?.forEach((connection) => connection.send(path));
}

function cooldown(username) {
	buffer.push(username);
	console.log(buffer);
	setTimeout(() => {
		buffer = buffer.filter((user) => user !== username);
		console.log(buffer);
	}, 5000);
}

// SysTray Handler
var CW;
try {
	CW = require('node-hide-console-window');
	CW.hideConsole();
} catch (error) {
	console.log(`Couldn't get the node-hide-console-window module`);
}

systray.onClick((action) => {
	if (action.seq_id === 0) {
		try {
			if (consoleToggle) {
				CW.showConsole();
				systray.sendAction({
					type: 'update-item',
					item: {
						...action.item,
						title: 'Hide Console',
						seq_id: action.seq_id,
					},
				});
				consoleToggle = !consoleToggle;
			} else {
				CW.hideConsole();
				systray.sendAction({
					type: 'update-item',
					item: {
						...action.item,
						title: 'Show Console',
						seq_id: action.seq_id,
					},
				});
				consoleToggle = !consoleToggle;
			}
		} catch (e) {
			console.log(`Can't toggle console.`);
		}
	} else if (action.seq_id === 1) {
		explorer(`start "" "${__dirname}/resources"`);
	} else if (action.seq_id === 2) {
		process.exit(0);
	}
});
