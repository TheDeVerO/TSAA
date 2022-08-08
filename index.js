const tmi = require('tmi.js');
const getFiles = require('./get-files');
const serverHandler = require('./server-handler');

const socket = serverHandler.createServer();

const tmiClient = new tmi.Client({
	connection: { secure: true, reconnect: true },
	channels: ['angysaoirse'],
});

const files = getFiles();
const commands = {};

files.forEach((file) => {
	if (typeof file === 'object' && file !== null) {
		// console.log('called');
		commands[file.command] = {
			callback: function callback() {
				const rand = Math.floor(Math.random() * file.files.length);
				console.log(rand);
				// playAudio(file.files[rand]);
			},
		};
	} else {
		const split = file.replace(/\\/g, '/').split('/');
		commands[split[split.length - 1]] = {
			callback: function callback() {
				console.log(file);
			},
		};
	}
});

tmiClient.on('message', (channel, tags, message, self) => {
	if (self) return;

    commands.keys(commands).forEach((command) => {
        
    })
    
});

console.log(commands);
commands.Test.callback();
