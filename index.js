const getFiles = require('./get-files');

const files = getFiles();
const commands = [];

files.forEach((file) => {
    const split = file.replace(/\\/g, '/').split('/');
})
