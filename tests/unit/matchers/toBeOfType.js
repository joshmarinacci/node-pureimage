const fileType = require('file-type');

let toBeOfType = (received, argument) => {

    const pass = fileType(received).ext.toLowerCase() == argument.toLowerCase();
    if (pass) {
        return {
            message: () => `expected ${fileType(received).ext} not to be a ${argument}`,
            pass: true
        };
    } else {
        return {
            message: () => `expected ${fileType(received).ext} to be a ${argument}`,
            pass: false
        };
    }
};

module.exports = {toBeOfType};
