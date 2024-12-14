import { compile as compileSfc } from 'vue-inbrowser-compiler'
import * as vue from 'vue'

export function compile<T = unknown>(code: string, importedModules: Record<string, any> = {}): vue.DefineComponent<T> {
  const mod: any = Object.assign({ vue }, vue.inject<Record<string, any>>('additionalModules'), importedModules)
  return (new Function(`return (function jitVueComp(require, module){${compileSfc(code).script}})`)())((id: string) => {
    if (!Object.hasOwn(mod, id)) throw new TypeError('[CJS] Not found module: ' + id)
    return mod[id]
  }, Object.seal({ exports: {} }))
}
