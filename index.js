const getFiles = require('./get-files');

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

console.log(commands);
commands.test.callback();
