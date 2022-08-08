const fs = require('fs');

function getFiles(dir = '') {
	const files = (fs.Dirent = fs.readdirSync(`${__dirname}/resources/${dir && dir + '/'}`, { withFileTypes: true }));

	const sounds = [];

	files.forEach((file) => {
		if (file.isDirectory()) {
			sounds.push({ command: file.name, files: getFiles(file.name) });
		} else {
			sounds.push(file.name);
		}
	});

	return sounds;
}

module.exports = getFiles;
