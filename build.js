import {build} from 'esbuild'
import pkg from 'npm-dts'
const {Generator} = pkg

async function go() {
    const sharedConfig = {
        entryPoints: ['src/index.ts'],
        bundle: true,
        minify: true,
    }

    await new Generator({
        entry: 'src/index.ts',
        output: 'dist/index.d.ts',
    }).generate();

    await build({
        ...sharedConfig,
        platform: 'node',
        outfile: 'dist/index.cjs',
    })

    // await build({
    //     ...sharedConfig,
    //     platform: 'neutral',
    //     format: 'esm',
    //     outfile: 'dist/esm/index.js'
    // })
}

go().then(()=>console.log("done")).catch((e)=>console.log(e))
