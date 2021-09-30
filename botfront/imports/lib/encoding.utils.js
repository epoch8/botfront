import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

/**
 * @param {Buffer} buffer
 * @returns {string}
 */
export function toUtf8(buffer) {
    const { encoding } = jschardet.detect(buffer);
    console.log(`Data encoding: ${encoding}`);
    if (encoding === 'UTF-8' || encoding === 'ascii') {
        return buffer.toString('utf-8');
    }
    console.log('Converting to utf-8');
    return iconv.decode(buffer, encoding);
}
