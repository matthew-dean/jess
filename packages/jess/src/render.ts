import * as rollup from 'rollup'
import * as path from 'path'
import * as fs from 'fs'
import commonJs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'
import sucrase from '@rollup/plugin-sucrase'
import virtual from '@rollup/plugin-virtual'
import jess from './plugin/rollup'
import { default as defaultConfig } from './config'
import merge from 'lodash/merge'

/**
 * Render CSS and (optionally) a runtime module
 */
export const render = async (filePath: string, config = {}) => {
  const opts = merge({}, defaultConfig, config)
  
  const bundle = await rollup.rollup({
    input: filePath,
    plugins: [
      virtual({
        './config': `export default { options: ${JSON.stringify(opts.options)}}`
      }),
      // nodeResolve({
      //   extensions: ['.js', '.ts']
      // }),
      // commonJs(),
      jess(opts.options)
      // sucrase({
      //   exclude: ['node_modules/**'],
      //   transforms: ['typescript']
      // })
    ],
    external: [
      /node_modules/,
      'jess'
    ]
  })

  let compilerFile = filePath.replace(/\.jess$/, '__.js')
  const { output } = await bundle.generate({
    format: 'cjs',
    file: compilerFile,
    exports: 'named'
  })
  compilerFile = path.resolve(process.cwd(), compilerFile)

  const compiler = output[0].code

  fs.writeFileSync(compilerFile, compiler)
  const css = require(compilerFile).default(opts.vars)
  fs.unlinkSync(compilerFile)
  
  return {
    ...css,
    $js: output[1] && (<any>output[1]).source
  }
}