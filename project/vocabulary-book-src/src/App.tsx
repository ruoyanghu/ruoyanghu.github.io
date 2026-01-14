import type { ChangeEvent } from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { lemmatizeWord, type VerbForms } from './lib/lemmatizer'
import { lookupWordNetDefinition } from './lib/wordnet'
import './App.css'

const MAX_TEXT_LENGTH = 60000
const MAX_FILE_SIZE = 400 * 1024 // ~400 KB
const DEFAULT_TOP_LIMIT = 20
const LOCAL_STORAGE_KEY = 'vocab-known-words'
const HISTORY_STORAGE_KEY = 'vocab-history'
const HISTORY_LIMIT = 10
const DICTIONARY_ENDPOINT = 'https://api.dictionaryapi.dev/api/v2/entries/en/'

const FALLBACK_COMMON_WORDS = [
  'the',
  'be',
  'to',
  'of',
  'and',
  'a',
  'in',
  'that',
  'have',
  'i',
  'it',
  'for',
  'not',
  'on',
  'with',
  'he',
  'as',
  'you',
  'do',
  'at',
  'this',
  'but',
  'his',
  'by',
  'from',
  'they',
  'we',
  'say',
  'her',
  'she',
  'or',
  'an',
  'will',
  'my',
  'one',
  'all',
  'would',
  'there',
  'their',
  'what',
  'so',
  'up',
  'out',
  'if',
  'about',
  'who',
  'get',
  'which',
  'go',
  'me',
  'when',
  'make',
  'can',
  'like',
  'no',
  'just',
  'him',
  'know',
  'take',
  'people',
  'into',
  'year',
  'your',
  'good',
  'some',
  'could',
  'them',
  'see',
  'other',
  'than',
  'then',
  'now',
  'look',
  'only',
  'come',
  'its',
  'over',
  'think',
  'also',
  'back',
  'after',
  'use',
  'two',
  'how',
  'our',
  'work',
  'first',
  'well',
  'way',
  'even',
  'new',
  'want',
  'because',
  'any',
  'these',
  'give',
  'day',
  'most',
  'us',
  'time',
  'man',
  'find',
  'here',
  'thing',
  'give',
  'many',
  'well',
  'those',
  'tell',
  'very',
  'even',
  'back',
  'any',
  'good',
  'woman',
  'through',
  'life',
  'child',
  'there',
  'work',
  'down',
  'may',
  'after',
  'should',
  'call',
  'world',
  'over',
  'school',
  'still',
  'try',
  'last',
  'ask',
  'need',
  'too',
  'feel',
  'three',
  'state',
  'never',
  'become',
  'between',
  'high',
  'really',
  'something',
  'most',
  'another',
  'much',
  'family',
  'own',
  'leave',
  'put',
  'old',
  'while',
  'mean',
  'keep',
  'student',
  'why',
  'let',
  'great',
  'same',
  'big',
  'group',
  'begin',
  'seem',
  'country',
  'help',
  'talk',
  'where',
  'turn',
  'problem',
  'every',
  'start',
  'hand',
  'might',
  'american',
  'show',
  'part',
  'against',
  'place',
  'such',
  'again',
  'few',
  'case',
  'week',
  'company',
  'system',
  'each',
  'right',
  'program',
  'hear',
  'question',
  'during',
  'play',
  'government',
  'run',
  'small',
  'number',
  'off',
  'always',
  'move',
  'night',
  'live',
  'mr',
  'point',
  'believe',
  'hold',
  'today',
  'bring',
  'happen',
  'next',
  'without',
  'before',
  'large',
  'million',
  'must',
  'home',
  'under',
  'water',
  'room',
  'write',
  'mother',
  'area',
  'national',
  'money',
  'story',
  'young',
  'fact',
  'month',
  'different',
  'lot',
  'study',
  'book',
  'eye',
  'job',
  'word',
  'though',
  'business',
  'issue',
  'side',
  'kind',
  'four',
  'head',
  'far',
  'black',
  'long',
  'both',
  'little',
  'house',
  'yes',
  'since',
  'around',
  'provide',
  'service',
  'friend',
  'important',
  'father',
  'sit',
  'away',
  'until',
  'power',
  'hour',
  'game',
  'often',
  'yet',
  'line',
  'political',
  'end',
  'among',
  'ever',
  'stand',
  'bad',
  'lose',
  'member',
  'pay',
  'law',
  'meet',
  'car',
  'city',
  'almost',
  'include',
  'continue',
  'set',
  'later',
  'community',
  'name',
  'five',
  'once',
  'white',
  'least',
  'president',
  'learn',
  'real',
  'change',
  'minute',
  'best',
  'several',
  'idea',
  'kid',
  'body',
  'information',
  'nothing',
  'ago',
  'lead',
  'social',
  'understand',
  'whether',
  'watch',
  'together',
  'follow',
  'parent',
  'stop',
  'face',
  'create',
  'public',
  'already',
  'speak',
  'others',
  'read',
  'level',
  'allow',
  'office',
  'spend',
  'door',
  'health',
  'person',
  'art',
  'sure',
  'war',
  'history',
  'party',
  'within',
  'grow',
  'result',
  'open',
  'morning',
  'walk',
  'reason',
  'low',
  'win',
  'research',
  'girl',
  'guy',
  'early',
  'food',
  'moment',
  'himself',
  'air',
  'teacher',
  'force',
  'offer',
  'enough',
] as const

type Status = {
  type: 'info' | 'error'
  text: string
}

type DifficultWord = {
  lemma: string
  count: number
  verbForms?: VerbForms
}

type AnalysisResult = {
  totalUnique: number
  totalOccurrences: number
  sortedWords: DifficultWord[]
}

type DefinitionMap = Record<string, string>

type HistoryEntry = {
  id: string
  text: string
  createdAt: number
  summary: string
}

const buildWordSet = (words: Iterable<string>) => {
  const set = new Set<string>()
  for (const word of words) {
    const cleaned = word.trim().toLowerCase()
    if (cleaned) {
      set.add(cleaned)
    }
  }
  return set
}

const getStoredKnownWords = (): Record<string, true> => {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!rawValue) {
      return {}
    }

    const parsed = JSON.parse(rawValue) as Record<string, true> | string[]
    if (Array.isArray(parsed)) {
      return parsed.reduce<Record<string, true>>((acc, word) => {
        if (typeof word === 'string' && word.trim()) {
          acc[word.trim().toLowerCase()] = true
        }
        return acc
      }, {})
    }

    return Object.keys(parsed ?? {}).reduce<Record<string, true>>((acc, key) => {
      if (key.trim()) {
        acc[key.trim().toLowerCase()] = true
      }
      return acc
    }, {})
  } catch (error) {
    console.warn('Unable to read known words from storage:', error)
    return {}
  }
}

const getStoredHistory = (): HistoryEntry[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const rawValue = window.localStorage.getItem(HISTORY_STORAGE_KEY)
    if (!rawValue) {
      return []
    }
    const parsed = JSON.parse(rawValue) as HistoryEntry[]
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .filter(
        (entry) =>
          typeof entry?.text === 'string' &&
          typeof entry?.createdAt === 'number' &&
          typeof entry?.summary === 'string',
      )
      .slice(0, HISTORY_LIMIT)
  } catch (error) {
    console.warn('Unable to read history from storage:', error)
    return []
  }
}

const fetchDictionaryApiDefinition = async (word: string) => {
  try {
    const response = await fetch(`${DICTIONARY_ENDPOINT}${encodeURIComponent(word)}`)
    if (!response.ok) {
      return null
    }
    const payload = await response.json()
    const definition =
      payload?.[0]?.meanings?.[0]?.definitions?.[0]?.definition ?? null
    return definition
  } catch (error) {
    console.warn('Remote dictionary lookup failed for', word, error)
    return null
  }
}

function App() {
  const [inputText, setInputText] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [topLimit, setTopLimit] = useState(DEFAULT_TOP_LIMIT)
  const [commonWords, setCommonWords] = useState<Set<string>>(() =>
    buildWordSet(FALLBACK_COMMON_WORDS),
  )
  const [isLoadingCommonWords, setIsLoadingCommonWords] = useState(true)
  const [knownWords, setKnownWords] = useState<Record<string, true>>(() =>
    getStoredKnownWords(),
  )
  const [currentPage, setCurrentPage] = useState(0)
  const [definitions, setDefinitions] = useState<DefinitionMap>({})
  const [definitionLoadingMap, setDefinitionLoadingMap] = useState<Record<string, true>>({})
  const [history, setHistory] = useState<HistoryEntry[]>(() => getStoredHistory())

  useEffect(() => {
    let cancelled = false

    const loadCommonWords = async () => {
      try {
        const response = await fetch(
          `${import.meta.env.BASE_URL}data/google-10000-english-usa.txt`,
        )
        if (!response.ok) {
          throw new Error('File not found')
        }
        const text = await response.text()
        const words = text
          .split(/\s+/g)
          .map((word) => word.trim().toLowerCase())
          .filter(Boolean)
          .slice(0, 5000)

        if (!words.length) {
          throw new Error('File is empty')
        }

        if (cancelled) {
          return
        }

        setCommonWords(buildWordSet(words))
        setStatus({
          type: 'info',
          text: `Loaded ${words.length.toLocaleString()} common words from google-10000-english-usa.txt.`,
        })
      } catch (error) {
        console.warn('Unable to load google-10000-english-usa.txt:', error)
        if (cancelled) {
          return
        }
        setCommonWords(buildWordSet(FALLBACK_COMMON_WORDS))
        setStatus({
          type: 'info',
          text: 'Using built-in fallback list. Drop google-10000-english-usa.txt in public/data to improve accuracy.',
        })
      } finally {
        if (!cancelled) {
          setIsLoadingCommonWords(false)
        }
      }
    }

    loadCommonWords()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(knownWords))
    } catch (error) {
      console.warn('Unable to persist known words:', error)
    }
  }, [knownWords])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history))
    } catch (error) {
      console.warn('Unable to persist history:', error)
    }
  }, [history])

  const characterCount = inputText.length
  const pageSize = Math.max(1, topLimit)

  const remainingWords = useMemo(() => {
    if (!analysis) {
      return []
    }
    return analysis.sortedWords.filter(({ lemma }) => !knownWords[lemma])
  }, [analysis, knownWords])

  const ensureDefinition = async (lemma: string) => {
    if (definitions[lemma]) {
      return definitions[lemma]
    }

    const offlineDefinition = await lookupWordNetDefinition(lemma)
    if (offlineDefinition) {
      setDefinitions((previous) => ({
        ...previous,
        [lemma]: offlineDefinition,
      }))
      return offlineDefinition
    }

    const onlineDefinition = await fetchDictionaryApiDefinition(lemma)
    const resolvedDefinition = onlineDefinition ?? 'Definition not available.'
    setDefinitions((previous) => ({
      ...previous,
      [lemma]: resolvedDefinition,
    }))
    return resolvedDefinition
  }

  const totalRemaining = remainingWords.length
  const totalPages = totalRemaining ? Math.ceil(totalRemaining / pageSize) : 1

  const paginatedWords = useMemo(() => {
    if (!remainingWords.length) {
      return []
    }
    const start = currentPage * pageSize
    return remainingWords.slice(start, start + pageSize)
  }, [remainingWords, currentPage, pageSize])

  const startRank = totalRemaining === 0 ? 0 : currentPage * pageSize + 1
  const endRank =
    totalRemaining === 0 ? 0 : Math.min(totalRemaining, (currentPage + 1) * pageSize)

  const remainingOccurrences = useMemo(
    () => remainingWords.reduce((total, item) => total + item.count, 0),
    [remainingWords],
  )

  const knownWordsList = useMemo(
    () => Object.keys(knownWords).sort((a, b) => a.localeCompare(b)),
    [knownWords],
  )

  const knownWordsPreview = useMemo(
    () => knownWordsList.slice(0, 60),
    [knownWordsList],
  )

  const addHistoryEntry = useCallback(
    (text: string, analysisResult: AnalysisResult) => {
      const trimmed = text.trim()
      if (!trimmed) {
        return
      }

      const preview = trimmed.replace(/\s+/g, ' ').slice(0, 160)
      const entry: HistoryEntry = {
        id: `${Date.now()}`,
        text: trimmed,
        createdAt: Date.now(),
        summary: `${analysisResult.totalUnique} words | ${preview}${
          trimmed.length > preview.length ? '…' : ''
        }`,
      }

      setHistory((previous) => {
        const deduped = previous.filter((item) => item.text !== trimmed)
        return [entry, ...deduped].slice(0, HISTORY_LIMIT)
      })
    },
    [],
  )

  useEffect(() => {
    setCurrentPage(0)
  }, [analysis, pageSize])

  useEffect(() => {
    const maxPage = Math.max(0, totalPages - 1)
    if (currentPage > maxPage) {
      setCurrentPage(maxPage)
    }
  }, [currentPage, totalPages])

  const handleTextChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const nextValue = event.target.value
    const truncatedValue = nextValue.slice(0, MAX_TEXT_LENGTH)
    if (nextValue.length > MAX_TEXT_LENGTH) {
      setStatus({
        type: 'info',
        text: `Text truncated to ${MAX_TEXT_LENGTH.toLocaleString()} characters.`,
      })
    }
    setInputText(truncatedValue)
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.name.toLowerCase().endsWith('.txt')) {
      setStatus({
        type: 'error',
        text: 'Please upload a plain text (.txt) file. EPUB support is planned for a later version.',
      })
      event.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setStatus({
        type: 'error',
        text: `File is too large. The current limit is ${(MAX_FILE_SIZE / 1024).toFixed(0)} KB.`,
      })
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const text = (reader.result as string) ?? ''
      setInputText(text.slice(0, MAX_TEXT_LENGTH))
      setStatus({
        type: 'info',
        text: 'File loaded into the editor. Review or edit it before analyzing.',
      })
      event.target.value = ''
    }
    reader.onerror = () => {
      setStatus({
        type: 'error',
        text: 'Something went wrong while reading the file.',
      })
    }
    reader.readAsText(file)
  }

  const handleToggleKnown = (lemma: string) => {
    const normalized = lemma.toLowerCase()
    setKnownWords((previous) => {
      const alreadyKnown = Boolean(previous[normalized])
      const next = { ...previous }

      if (alreadyKnown) {
        delete next[normalized]
        setStatus({
          type: 'info',
          text: `"${lemma}" moved back to the training list.`,
        })
      } else {
        next[normalized] = true
        setStatus({
          type: 'info',
          text: `"${lemma}" saved as a known word. You can restore it from the list below.`,
        })
      }

      return next
    })
  }

  const loadDefinitionIfNeeded = useCallback(
    async (lemma: string) => {
      if (definitionLoadingMap[lemma] || definitions[lemma]) {
        return
      }
      setDefinitionLoadingMap((prev) => ({ ...prev, [lemma]: true }))
      try {
        await ensureDefinition(lemma)
      } catch (error) {
        console.warn('Unable to load definition for', lemma, error)
        setDefinitions((previous) => ({
          ...previous,
          [lemma]: 'Unable to load definition right now.',
        }))
      } finally {
        setDefinitionLoadingMap((prev) => {
          const next = { ...prev }
          delete next[lemma]
          return next
        })
      }
    },
    [definitionLoadingMap, definitions],
  )

  useEffect(() => {
    paginatedWords.forEach((word) => {
      loadDefinitionIfNeeded(word.lemma)
    })
  }, [paginatedWords, loadDefinitionIfNeeded])

  const handleNextPage = () => {
    setCurrentPage((previous) => Math.min(previous + 1, Math.max(0, totalPages - 1)))
  }

  const handlePreviousPage = () => {
    setCurrentPage((previous) => Math.max(0, previous - 1))
  }

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      setAnalysis(null)
      setStatus({
        type: 'error',
        text: 'Please paste text or upload a file before running the analysis.',
      })
      return
    }

    setDefinitions({})
    setDefinitionLoadingMap({})

    const normalized = inputText.toLowerCase()
    const tokens = normalized.match(/[a-z]+(?:'[a-z]+)?/g) ?? []
    const difficultWords = new Map<string, { count: number; verbForms?: VerbForms }>()

    tokens.forEach((token) => {
      const { lemma, verbForms } = lemmatizeWord(token)
      if (!lemma || commonWords.has(lemma)) {
        return
      }
      const entry = difficultWords.get(lemma) ?? { count: 0 }
      entry.count += 1
      if (verbForms) {
        entry.verbForms = verbForms
      }
      difficultWords.set(lemma, entry)
    })

    const sortedWords = Array.from(difficultWords.entries())
      .sort((a, b) => {
        const countDifference = b[1].count - a[1].count
        if (countDifference === 0) {
          return a[0].localeCompare(b[0])
        }
        return countDifference
      })
      .map(([lemma, data]) => ({
        lemma,
        count: data.count,
        verbForms: data.verbForms,
      }))

    const newAnalysis: AnalysisResult = {
      totalUnique: difficultWords.size,
      totalOccurrences: Array.from(difficultWords.values()).reduce(
        (total, current) => total + current.count,
        0,
      ),
      sortedWords,
    }

    setAnalysis(newAnalysis)

    setStatus({
      type: 'info',
      text:
        sortedWords.length === 0
          ? 'All of the words in the sample are part of the common word list.'
          : 'Analysis complete. Focus on the most frequent difficult words below.',
    })

    addHistoryEntry(inputText, newAnalysis)
  }

  const handleClear = () => {
    setInputText('')
    setAnalysis(null)
    setStatus(null)
    setDefinitions({})
    setDefinitionLoadingMap({})
  }

  const handleDownloadList = () => {
    if (!remainingWords.length) {
      setStatus({
        type: 'error',
        text: 'There are no difficult words to download. Run a new analysis or restore known words first.',
      })
      return
    }

    const lines = remainingWords.map(({ lemma }) => {
      const definition = definitions[lemma]
      return definition ? `${lemma} — ${definition}` : lemma
    })

    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'difficult-word-list.txt'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)

    setStatus({
      type: 'info',
      text: `Downloaded ${remainingWords.length} difficult word${
        remainingWords.length === 1 ? '' : 's'
      }.`,
    })
  }

  const handleLoadHistory = (entry: HistoryEntry) => {
    setInputText(entry.text)
    setStatus({
      type: 'info',
      text: 'Loaded text from history. Review or edit it before analyzing.',
    })
  }

  const handleDeleteHistory = (id: string) => {
    setHistory((previous) => previous.filter((entry) => entry.id !== id))
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="eyebrow">Vocabulary Learning Assistant</p>
        <h1>Prepare for reading with targeted vocabulary practice</h1>
        <p className="lead">
          Paste text from essays or upload a file. The assistant will strip out the
          most common 5,000 English words so you can focus on the rare vocabulary that
          slows down your reading.
        </p>
      </header>

      <section className="panel">
        <div className="input-header">
          <h2>1. Add your text</h2>
          <span className="character-count">
            {characterCount.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
          </span>
        </div>
        <textarea
          value={inputText}
          onChange={handleTextChange}
          placeholder="Paste your paragraph, chapter, or entire essay here..."
          rows={12}
        />
        <div className="control-row">
          <label className="upload-label">
            <span>Or upload a .txt file (limit {(MAX_FILE_SIZE / 1024).toFixed(0)} KB)</span>
            <input type="file" accept=".txt,text/plain" onChange={handleFileUpload} />
          </label>
          <div className="top-limit">
            <label htmlFor="top-limit">Show top</label>
            <input
              id="top-limit"
              type="number"
              min={5}
              max={200}
              value={topLimit}
              onChange={(event) => setTopLimit(Number(event.target.value) || DEFAULT_TOP_LIMIT)}
            />
            <span>words</span>
          </div>
          <div className="actions">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoadingCommonWords}
            >
              {isLoadingCommonWords ? 'Loading word list…' : 'Analyze'}
            </button>
            <button type="button" className="secondary" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>
        {status && <p className={`status ${status.type}`}>{status.text}</p>}
        <div className="history-panel">
          <div className="history-header">
            <h3>Recent analyses</h3>
            <p className="history-caption">
              The assistant remembers the last {HISTORY_LIMIT} samples on this device.
            </p>
          </div>
          {history.length ? (
            <ul className="history-list">
              {history.map((entry) => (
                <li key={entry.id}>
                  <div>
                    <p className="history-date">
                      {new Date(entry.createdAt).toLocaleString(undefined, {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </p>
                    <p className="history-summary">{entry.summary}</p>
                  </div>
                  <div className="history-actions">
                    <button type="button" onClick={() => handleLoadHistory(entry)}>
                      Load text
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => handleDeleteHistory(entry.id)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="history-empty">
              Run a few analyses to see history here. Your text never leaves the browser.
            </p>
          )}
        </div>
      </section>

      <section className="panel results-panel">
        <h2>2. Difficult word summary</h2>
        {analysis ? (
          <>
            <div className="stats-grid">
              <article className="stat-card">
                <p className="stat-label">Unique difficult words</p>
                <p className="stat-value">{analysis.totalUnique.toLocaleString()}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Total difficult occurrences</p>
                <p className="stat-value">
                  {analysis.totalOccurrences.toLocaleString()}
                </p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Words left to study</p>
                <p className="stat-value">{totalRemaining.toLocaleString()}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Occurrences left</p>
                <p className="stat-value">{remainingOccurrences.toLocaleString()}</p>
              </article>
            </div>

            {totalRemaining ? (
              <>
                <p className="list-caption">
                  Click a word to mark it as known. Definitions load automatically under each word
                  so you can evaluate them quickly.
                </p>
                <div className="pagination-row">
                  <span>
                    Showing {startRank}–{endRank} of {totalRemaining} words
                  </span>
                  <div className="pager">
                    <button type="button" onClick={handlePreviousPage} disabled={currentPage === 0}>
                      Previous
                    </button>
                    <span className="page-indicator">
                      Page {totalPages === 0 ? 0 : currentPage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
                <ol className="words-list">
                  {paginatedWords.map((item, index) => {
                    const definition = definitions[item.lemma]
                    const loading = Boolean(definitionLoadingMap[item.lemma])
                    return (
                      <li key={item.lemma}>
                        <span className="rank">{startRank + index}.</span>
                      <div className="word-info">
                        <div className="word-actions">
                          <button
                            type="button"
                            className="word-button"
                            title="Click to mark this word as known"
                            onClick={() => handleToggleKnown(item.lemma)}
                          >
                            {item.lemma}
                          </button>
                        </div>
                        {item.verbForms ? (
                          <p className="word-forms">
                            {item.verbForms.infinitive}
                            {item.verbForms.present ? ` · ${item.verbForms.present}` : null}
                            {item.verbForms.past ? ` · ${item.verbForms.past}` : null}
                            {item.verbForms.participle
                              ? ` · ${item.verbForms.participle}`
                              : null}
                          </p>
                        ) : null}
                        <p className="definition-inline">
                          {loading
                            ? 'Loading definition…'
                            : definition ?? 'Loading definition…'}
                        </p>
                      </div>
                        <span className="count">{item.count}×</span>
                      </li>
                    )
                  })}
                </ol>
              </>
            ) : (
              <p className="empty-state">
                Incredible—every remaining word is now marked as known. Paste a new passage or
                restore a word if you want to keep practicing.
              </p>
            )}

            {knownWordsList.length ? (
              <div className="known-words-panel">
                <p className="list-caption">
                  Known words ({knownWordsList.length}
                  {knownWordsList.length > knownWordsPreview.length
                    ? `, showing ${knownWordsPreview.length}`
                    : ''}
                  ). Click one to restore it to the difficult list.
                </p>
                <div className="known-words-grid">
                  {knownWordsPreview.map((word) => (
                    <button
                      type="button"
                      className="known-chip"
                      key={word}
                      onClick={() => handleToggleKnown(word)}
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="empty-state">
            Run an analysis to see how many unfamiliar words appear in your source text.
          </p>
        )}
      </section>

      <section className="panel study-panel">
        <h2>3. Export difficult words</h2>
        {analysis ? (
          <>
            <p className="lead">
              Download the remaining difficult words (with their inline definitions) as a plain-text
              list. Use this file as a study deck or share it with your tutor.
            </p>
            <div className="definition-actions">
              <button
                type="button"
                className="secondary"
                onClick={handleDownloadList}
                disabled={!remainingWords.length}
              >
                Download study list
              </button>
            </div>
            {!remainingWords.length && (
              <p className="empty-state">
                There are no difficult words left to export. Paste new text or restore a known word.
              </p>
            )}
          </>
        ) : (
          <p className="empty-state">Run an analysis above to generate your study list.</p>
        )}
      </section>

    </div>
  )
}

export default App
