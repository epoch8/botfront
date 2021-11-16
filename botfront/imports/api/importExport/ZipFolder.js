

import JSZIP from 'jszip';

export class ZipFolder {
    constructor (filePrefix) {
        this.zipContainer = new JSZIP();
        this.filePrefix = filePrefix || '';
    }

    addFile = (data, fileName) => {
        if (!data) return;
        const rasaComponentBlob = Buffer.from(data);
        this.zipContainer = this.zipContainer.file(`${this.filePrefix}${fileName}`, rasaComponentBlob);
    }

    generateBlob = (output_type = 'base64') => this.zipContainer.generateAsync({ type: output_type })
}
