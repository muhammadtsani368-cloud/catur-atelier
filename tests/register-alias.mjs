import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const APP_DIR = resolve(ROOT_DIR, 'app')

function resolveWithTsFallback(candidatePath) {
  if (existsSync(candidatePath)) return candidatePath
  if (!candidatePath.endsWith('.ts') && existsSync(`${candidatePath}.ts`)) {
    return `${candidatePath}.ts`
  }
  return null
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('~/') || specifier.startsWith('@/')) {
      const subPath = specifier.slice(2)
      const hit = resolveWithTsFallback(resolve(APP_DIR, subPath))
      if (hit) {
        return nextResolve(pathToFileURL(hit).href, context)
      }
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:')
    ) {
      const parentDir = dirname(fileURLToPath(context.parentURL))
      const hit = resolveWithTsFallback(resolve(parentDir, specifier))
      if (hit) {
        return nextResolve(pathToFileURL(hit).href, context)
      }
    }

    return nextResolve(specifier, context)
  }
})
