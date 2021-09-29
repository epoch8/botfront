import * as iconv from 'iconv-lite';
import * as jschardet from 'jschardet';

export function toUtf8(data) {
    const { encoding } = jschardet.detect(data);
    console.log(`Data encoding: ${encoding}`);
    if (encoding === 'UTF-8' || encoding === 'ascii') {
        if (data instanceof Buffer) {
            return data.toString('utf-8');
        }
        return data;
    }
    console.log('Converting');
    const buf = (typeof data === 'string') ? Buffer.from(data) : data;
    return iconv.decode(buf, encoding);
}
