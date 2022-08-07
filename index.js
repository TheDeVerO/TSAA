const getFiles = require('./get-files');

const files = getFiles();
const commands = {};

files.forEach((file) => {
	if (typeof file === 'object' && file !== null) {
		console.log('called');
		commands[file.command] = function callback() {
			const rand = Math.floor(Math.random() * file.files.length);
			console.log(rand);
			// playAudio(file.files[rand]);
		};
	} else {
		console.log(file);
		const split = file.replace(/\\/g, '/').split('/');
	}
});

console.log(commands);
