import { extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Plugin } from 'vite'
import { generateImports } from '@vuetify/loader-shared'
import { parseQuery, parseURL } from 'ufo'
import { isAbsolute } from 'pathe'
import destr from 'destr'

function parseId2(id: string) {
  id = id.replace(/^(virtual:nuxt:|virtual:)/, '')
  return parseURL(decodeURIComponent(isAbsolute(id) ? pathToFileURL(id).href : id))
}

function parseId(id: string) {
  const { search, pathname } = parseId2(id)
  const query = parseQuery(search)
  const urlProps = query.props ? destr<Record<string, any>>(query.props as string) : undefined

  return {
    query: urlProps,
    path: pathname ?? id,
  }
}

export function vuetifyImportPlugin(): Plugin {
  return {
    name: 'vuetify:import',
    configResolved(config) {
      if (config.plugins.findIndex(plugin => plugin.name === 'vuetify:import') < config.plugins.findIndex(plugin => plugin.name === 'vite:vue'))
        throw new Error('Vuetify plugin must be loaded after the vue plugin')
    },
    async transform(code, id) {
      const { query, path } = parseId(id)

      if (
        ((!query || !('vue' in query)) && extname(path) === '.vue' && !/^import { render as _sfc_render } from ".*"$/m.test(code))
        || (query && 'vue' in query && (query.type === 'template' || (query.type === 'script' && query.setup === 'true')))
      ) {
        const { code: imports, source } = generateImports(code)
        return {
          code: source + imports,
          map: null,
        }
      }

      return null
    },
  }
}
