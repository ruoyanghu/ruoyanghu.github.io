const POS_ORDER = ['noun', 'verb', 'adj', 'adv'] as const

type WordNetPOS = (typeof POS_ORDER)[number]

type IndexMap = Map<string, number[]>
type DataMap = Map<number, string>

const indexCache = new Map<WordNetPOS, IndexMap>()
const dataCache = new Map<WordNetPOS, DataMap>()
const indexPromises = new Map<WordNetPOS, Promise<IndexMap>>()
const dataPromises = new Map<WordNetPOS, Promise<DataMap>>()
const definitionCache = new Map<string, string>()

const BASE_PATH = `${import.meta.env.BASE_URL}data/dict`

const fetchText = async (path: string) => {
  const response = await fetch(path)
  if (!response.ok) {
    throw new Error(`Unable to load ${path}`)
  }
  return response.text()
}

const parseIndex = (text: string): IndexMap => {
  const map: IndexMap = new Map()
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    if (!line || line[0] === ' ' || line.startsWith('#')) {
      continue
    }
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }
    const tokens = trimmed.split(/\s+/)
    if (tokens.length < 6) {
      continue
    }

    const lemma = tokens[0]?.toLowerCase()
    const synsetCount = Number(tokens[2])
    const pointerCount = Number(tokens[3])
    if (!lemma || Number.isNaN(synsetCount) || Number.isNaN(pointerCount)) {
      continue
    }

    const pointerEnd = 4 + pointerCount
    const offsetsStart = pointerEnd + 2
    const offsetsEnd = offsetsStart + synsetCount
    if (offsetsStart >= tokens.length) {
      continue
    }

    const offsets = tokens
      .slice(offsetsStart, offsetsEnd)
      .map((token) => Number(token))
      .filter((value) => Number.isFinite(value))

    if (offsets.length) {
      map.set(lemma, offsets)
    }
  }

  return map
}

const parseData = (text: string): DataMap => {
  const map: DataMap = new Map()
  const lines = text.split(/\r?\n/)

  for (const rawLine of lines) {
    if (!rawLine || rawLine[0] === ' ' || rawLine.startsWith('#')) {
      continue
    }
    const line = rawLine.trim()
    if (!line) {
      continue
    }
    const partsIndex = line.indexOf('|')
    if (partsIndex === -1) {
      continue
    }
    const firstSpace = line.indexOf(' ')
    if (firstSpace === -1) {
      continue
    }
    const offsetToken = line.slice(0, firstSpace)
    const offset = Number(offsetToken)
    if (!Number.isFinite(offset)) {
      continue
    }
    const gloss = line.slice(partsIndex + 1).trim()
    if (gloss) {
      map.set(offset, gloss)
    }
  }

  return map
}

const ensureIndex = (pos: WordNetPOS) => {
  if (indexCache.has(pos)) {
    return Promise.resolve(indexCache.get(pos)!)
  }
  if (indexPromises.has(pos)) {
    return indexPromises.get(pos)!
  }

  const promise = fetchText(`${BASE_PATH}/index.${pos}`)
    .then((text) => parseIndex(text))
    .then((map) => {
      indexCache.set(pos, map)
      return map
    })
    .finally(() => {
      indexPromises.delete(pos)
    })

  indexPromises.set(pos, promise)
  return promise
}

const ensureData = (pos: WordNetPOS) => {
  if (dataCache.has(pos)) {
    return Promise.resolve(dataCache.get(pos)!)
  }
  if (dataPromises.has(pos)) {
    return dataPromises.get(pos)!
  }

  const promise = fetchText(`${BASE_PATH}/data.${pos}`)
    .then((text) => parseData(text))
    .then((map) => {
      dataCache.set(pos, map)
      return map
    })
    .finally(() => {
      dataPromises.delete(pos)
    })

  dataPromises.set(pos, promise)
  return promise
}

const normalizeLemma = (word: string) =>
  word
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')

export const lookupWordNetDefinition = async (word: string) => {
  const normalized = normalizeLemma(word)
  if (!normalized) {
    return null
  }

  if (definitionCache.has(normalized)) {
    return definitionCache.get(normalized)!
  }

  for (const pos of POS_ORDER) {
    try {
      const index = await ensureIndex(pos)
      const offsets = index.get(normalized)
      if (!offsets?.length) {
        continue
      }

      const data = await ensureData(pos)
      for (const offset of offsets) {
        const gloss = data.get(offset)
        if (gloss) {
          definitionCache.set(normalized, gloss)
          return gloss
        }
      }
    } catch (error) {
      console.warn(`WordNet lookup failed for ${word} (${pos}):`, error)
    }
  }

  return null
}
