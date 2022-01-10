const exported = [];
const cNames = [
    'Explicit Esm exports %O',
    'Explicit Common js export %O',
    'Implicit Esm exports %O',
];
import * as pureimage from '../../../dist/pureimage.mjs';
exported[0] = Object.keys(pureimage);
console.log(cNames[0],exported[0]);

import * as cjsPureimage from '../../../dist/pureimage.cjs';
exported[1] = Object.keys(cjsPureimage);
console.log(cNames[1],exported[1]);

import * as esmPureimage from '../../../dist/pureimage.mjs';
exported[2] = Object.keys(esmPureimage);
console.log(cNames[2],exported[2]);

exported.map(v => v.join());

if (exported[0] === exported[1] && exported[1] === exported[2]) {
    console.log('exports aligned');
} else {
    console.error('exports miss-match');
    // eslint-disable-next-line no-undef
    process.exit(1);
}
