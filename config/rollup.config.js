import ts from 'rollup-plugin-ts';
import { readFileSync } from 'fs';
const pkg = JSON.parse(readFileSync('./package.json',{encoding:'utf-8'}));
import { terser } from 'rollup-plugin-terser';
import clear from 'rollup-plugin-clear';

const dist = './dist/';
const BASE_FILE_NAME = pkg.name;
const input = 'src/index.ts';

const tsIn = ts({
    transpiler: 'babel',
    include: ['src/**/*.[tj]s'],
    transpileOnly:true,
    browserslist: false,
    tsconfig: 'tsconfig.json',
    tsconfigOverride: {
        'exclude': [
            '**/*.test.*',
        ],
        compilerOptions: {
            rootDir: './src',
        },
        declarationDir: './dist',
    },
});
const defaultMap = {'umd':'.js'};
const extMap = {'es':'.mjs','cjs':'.cjs', ...defaultMap};
const compatMap = {'es':'.esm.js','cjs':'.cjs.js', ...defaultMap};
const out = (
    format,
    compat = false,
    exportsId = 'auto',
    browser = false,
    extend = undefined,
) => ({
    file: `${
        dist
    }${
        BASE_FILE_NAME
    }${
        browser ? '.browser' : ''
    }${
        compat ? compatMap[format] : extMap[format]
    }`,
    plugins: [terser()],
    format,
    exports: exportsId,
    name: ['named','default'].includes(exportsId) ? pkg.name : undefined,
    sourcemap: !browser,
    extend,
});

export default [
    {
        input,
        plugins:[
            clear({ targets: ['dist'] }),
            tsIn,
        ],
        external: Object.keys(pkg.dependencies),
        output: [
            out('cjs',true,'named'),
            out('cjs',false,'named'),
            out('es',true),
            out('es',false),
        ],
    },
    {
        input: 'src-browser/index.ts',
        plugins:[
            ts({
                transpiler: 'babel',
                include: ['src-browser/**/*.[tj]s'],
                transpileOnly:true,
                browserslist: false,
                tsconfig: 'tsconfig.json',
                tsconfigOverride: {
                    'exclude': [
                        '**/*.test.*',
                    ],
                    compilerOptions: {
                        rootDir: './src-browser',
                    },
                    declarationDir: './dist',
                    sourceMap: false,
                },
            }),
        ],
        output: [
            out('cjs',false,'named',true),
            out('es',true, 'auto', true),
        ],
    },
];
