const tmi = require('tmi.js');
const fs = require('fs');
const http = require('http');
const WebSocketServer = require('websocket').server;
const SysTray = require('systray').default;
const explorer = require('child_process').exec;

// Function that gets files from specified folder and returns an array of items.
const getFiles = require('./get-files');
// Config for SysTray manager.
const systrayConfig = require('./systray.json');

// Getting files from folders.
const files = getFiles(`resources/`);
const exclusives = getFiles('exclusives/');

// Creating a SysTray using SysTray Config.
const systray = new SysTray(systrayConfig);

// Will contain commands list to wait for.
const commands = {};

// WIP. isn't used currently.
const users = {};

// Handles showing and hiding the console.
var consoleToggle = true;

// Users on cooldown buffer. Will contain an array of users.
var buffer = [];

// Web Socket server variable.
var wsServer;

exclusives.forEach((user) => {
	if (typeof user === 'object' && user !== null) {
		// userName = user.split('.').slice(0, -1).join('.');
		users[user.name] = {
			callback: function callback(word) {
				playSound(`exclusives/${user}/${word}`);
			},
		};
	} else {
		console.log(`Ayo, wuut daaa heeeeck brubber? You need to put ${user} file in the folder named after user nickname`);
	}
});

// Filling the commands object with commands and files.
files.forEach((file) => {
	// If file is an object - that means that it's a folder, and we're pulling a random sound from it on call.
	if (typeof file === 'object' && file !== null) {
		commands[file.command] = {
			// Assigning a callback function.
			callback: function callback() {
				const rand = Math.random() * file.files.length - 1;
				// If there's less than 3 files - print a warning message.
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

// Initialling Twitch Messaging Interface. It will be managing message catching events.
// Currently declaring channel on the spot, since the app was built per exclusive request.
const tmiClient = new tmi.Client({
	connection: { secure: true, reconnect: true },
	channels: ['angysaoirse'],
});

// Connecting to Twitch API.
tmiClient.connect();
// Creating a local server.
createServer();

// Function that creates a local server on port 8082, to which the streaming software will connect.
function createServer() {
	const PORT = 8082;

	fs.readFile('./index.html', function (err, html) {
		if (err) console.log(err);
		// Creating an http server.
		const httpServer = http
			.createServer(function (req, res) {
				if (req.url === '/') {
					// Base url connection, it is where we display the html content.
					console.log(`Homepage requested.`);

					res.writeHead(200, { 'Content-Type': 'text/html' });
					res.write(html);
					res.end();
				} else if (req.url.startsWith('/resources')) {
					// Resources request. Piping files from resources folder to ble played.
					console.log(`Resources requested.`);

					// Deciphering URL encoding to pipe the correct file.
					const path = decodeURIComponent(req.url);

					console.log(`Looking for ${path}...`);

					// If file exists - piping it.
					// TODO: 404 handler.
					if (fs.existsSync(__dirname + path)) {
						console.log(`Found. Uploading...`);

						// Creating a readStream from the requested file to pass to the frontend.
						const readStream = fs.createReadStream(__dirname + path);
						res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
						readStream.pipe(res);
					}
				} else if (req.url.startsWith('/exclusives')) {
					// Exclusives request. Piping files from exclusives folder to be played.
					console.log(`Exclusives called.`);

					// Deciphering URL encoding to pipe the correct file.
					const path = decodeURIComponent(req.url);

					console.log(`Looking for ${path}...`);

					// If file exists - piping it.
					if (fs.existsSync(__dirname + path)) {
						console.log(`Found. Uploading...`);

						// Creating a readStream from the requested file to pass to the frontend.
						const readStream = fs.createReadStream(__dirname + path);
						res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
						readStream.pipe(res);
					}
				}
			})
			.listen(PORT, () => {
				// Starting to listen on specified port for requests.

				console.log(`Server running on localhost:${PORT}/...`);
			});

		// Creating a Web Socket Server. It will handle signaling from the server to the client;
		// We're binding Web Socket Server to HTTP server, so that we don't have to take two ports.
		wsServer = new WebSocketServer({
			httpServer: httpServer,
		});

		// Printing out the information message on websocket connection.
		wsServer.on('connect', () => {
			console.log('Web Socket Server is connected.');
		});

		// websocket request handler.
		wsServer.on('request', (request) => {
			console.log(`Web Socket Server received a request.`);

			// Accepting the connection, will add security logic in the future.
			var connection = request.accept();

			// Connection request handler. Currently, client is not supposed to send any requests, but in case it does - relaying the messages to other connections.
			connection.on('message', (data) => {
				console.log('Connection received a message. Relaying...');
				wsServer.connections.forEach((connection) => {
					connection.send(data.utf8Data);
				});
			});

			// Displaying the information message on websocket connection closing.
			connection.on('close', () => {
				console.warn(`Connection closed.`);
			});
		});
	});
}

// Twitch Messaging Interface message handler.
tmiClient.on('message', (channel, tags, message, self) => {
	// (Userful only in case I'll add a bot to this service...)
	// Ignoring messages sent by self (bot).
	if (self) return;

	// Checking if message is addressed to bot.
	if (!message.startsWith('!')) return;

	// If user requested the command is on cooldown - ignoring the command.
	if (buffer.indexOf(tags.username) >= 0) return;

	console.log('tmiClient received a command message.');

	// Removing a prefix (!) from the message.
	const sound = message.substring(1);
	console.log(`Received command: [${sound}].`);

	// Trying to call a command callback if one exists.
	try {
		commands[sound].callback();
	} catch (error) {
		// If not - ignoring and printing a message.
		console.error(error.message);
		console.log('No such command found.');
	}
	// Adding a user to the cooldown buffer.
	cooldown(tags.username);
});

// Function that sends a playSound command to the frontend through websocket.
function playSound(path) {
	// If there are no connections on call - printing instructions and information about connections.
	if (wsServer.connections.length < 0) {
		console.warn('WARNING! No connections. Your streaming software is most likely not capturing sound.');
		console.warn(`Are you sure you've added http://localhost:${PORT}/ as browser source?`);
		console.warn(`If browser source is added corretly - try selecting the source and pressing "Refresh" button.`);
		console.warn(`If the issue persists, DM me about it.`);
		return;
	}
	// Otherwise, going through connections and sending a playSound command.
	console.log('Sending playSound signal... Connections: ' + wsServer.connections.length);
	wsServer.connections?.forEach((connection) => connection.send(path));
}

// Cooldown handler. Adds a username to buffer array for 5 seconds.
function cooldown(username) {
	buffer.push(username);
	setTimeout(() => {
		buffer = buffer.filter((user) => user !== username);
	}, 5000);
}

// SysTray Handler. It handles tray icon and it interaction.
var CW;
// Trying to require it, because it's not available on MAC and Linux.
try {
	CW = require('node-hide-console-window');
	CW.hideConsole();
} catch (error) {
	console.log(`Couldn't get the node-hide-console-window module`);
}

// System Tray click handler.
// Manages the popout menu on click.
systray.onClick((action) => {
	if (action.seq_id === 0) {
		// Console toggle button.
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
		// Open resources folder button.
		explorer(`start "" "${__dirname}/resources"`);
	} else if (action.seq_id === 2) {
		// Exit button.
		process.exit(0);
	}
});
