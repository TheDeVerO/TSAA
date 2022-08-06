const fs = require('fs');

function getFiles(dir = `${__dirname}/resources`) {
	const files = (fs.Dirent = fs.readdirSync(dir, { withFileTypes: true }));

	const sounds = [];

	files.forEach((file) => {
		if (file.isDirectory()) {
			sounds.push(getFiles(`${dir}/${file.name}`));
		} else {
			sounds.push(`${dir}/${file.name}`);
		}
	});

	return sounds;
}

module.exports = getFiles;
