import fileType from "file-type"

export let toBeOfFileType = (received, expected) => {

    const fileData  = fileType(received);
    const extension = (fileData !== null) ? fileData.ext : 'unknown file type';

    if (extension === expected.toLowerCase()) {
        return {
            message: () => `expected ${extension} not to be a ${expected}`,
            pass: true
        };
    } else {
        return {
            message: () => `expected ${extension} to be a ${expected}`,
            pass: false
        };
    }

    return result;
};


