const fs = require('fs');

function getFiles(dir) {
	const files = (fs.Dirent = fs.readdirSync(`${__dirname}/${dir}`, { withFileTypes: true }));

	const sounds = [];

	if (files.length === 0) {
		console.log('No sounds found! Did you forget to add sounds in the "resources" folder?');
		return [];
	}

	files.forEach((file) => {
		if (file.isDirectory()) {
			sounds.push({ command: file.name, files: getFiles(`${dir}/${file.name}`) });
		} else {
			sounds.push(file.name);
		}
	});

	return sounds;
}

module.exports = getFiles;
