import { App } from 'vue'

export function createInbrowserCompiler(options: {
  addition: Record<string, any>
}) {
  return {
    install(app: App) {
      app.provide('additionalModules', options.addition)
    }
  }
}