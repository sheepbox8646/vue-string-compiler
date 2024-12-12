import { defineComponent } from 'vue'
import { compile as clp } from 'vue-inbrowser-compiler'
import * as vue from 'vue'

export function precompile(code: string): string {
  const compiledObject = clp(code)
  let script = compiledObject.script
  
  // 处理 require 语句
  const requirePattern = /(?:(?:var|const|let)\s+)?([$\w]+)\s*=\s*require\((["'])(.+?)\2\)/g
  const matches = Array.from(script.matchAll(requirePattern))

  const additionalModules = vue.inject<Record<string, any>>('additionalModules')

  // 处理模块映射
  const modules = {
    ...(additionalModules ?? {}),
  }

  // 注入 Vue 到全局
  for (const key in vue) {
    (window as any)[key] = vue[key]
  }

  // 处理模块导入
  for (const match of matches) {
    const varName = match[1]
    const moduleName = match[3]

    if (modules.hasOwnProperty(moduleName)) {
      (window as any)[varName] = modules[moduleName]
    }
  }

  // 找出所有函数内部定义的变量
  const functionScopedVars = new Set<string>()
  
  // 匹配函数体的模式
  const functionPattern = /(?:function\s*\w*\s*\([^)]*\)|(?:\([^)]*\)|[^=])\s*=>|\w+\s*\([^)]*\))\s*{([^}]*)}|(?:\([^)]*\)|[^=])\s*=>\s*([^;,}]+)/g

  // 匹配变量声明和赋值
  const varDeclarationPattern = /(?:var|let|const)\s+(\w+)\s*=|(\w+)\s*=(?!=)/g

  let match
  while ((match = functionPattern.exec(code)) !== null) {
    const functionBody = match[1] || match[2]
    if (!functionBody) continue

    let varMatch
    while ((varMatch = varDeclarationPattern.exec(functionBody)) !== null) {
      const varName = varMatch[1] || varMatch[2]
      if (varName) {
        functionScopedVars.add(varName.trim())
      }
    }

    // 处理箭头函数的参数解构
    const arrowParamsMatch = code.slice(Math.max(0, match.index - 50), match.index)
      .match(/\(?\s*{([^}]+)}\s*\)?\s*=>/)
    if (arrowParamsMatch) {
      const params = arrowParamsMatch[1].split(',')
      params.forEach(param => {
        const paramName = param.trim().split(':')[0].trim()
        if (paramName) {
          functionScopedVars.add(paramName)
        }
      })
    }
  }

  // 修改 return 语句，移除函数内部定义的变量
  script = script.replace(
    /return\s*{([^}]+)}/g,
    (match, returnContent) => {
      const validReturns = returnContent
        .split(',')
        .map(item => item.trim())
        .filter(item => {
          const varName = item.split(':')[0].trim()
          return !functionScopedVars.has(varName)
        })
        .join(',')
      
      return `return {${validReturns}}`
    }
  )

  // 清理 require 语句
  script = script.replace(
    /^.*require\(("|').+("|')\);/gm,
    ''
  )

  return script
}

export function compile(processed: string) {
  return defineComponent(Function(processed)())
}
