import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

// https://rollupjs.org/guide/en/#configuration-files
export default {
    input: 'src/index.js',
    output: {
        file: 'dist/pureimage-umd.cjs',
        format: 'umd',
        name: 'PureImage'
    },
    plugins: [
        resolve(),
        commonjs()
    ]
};
