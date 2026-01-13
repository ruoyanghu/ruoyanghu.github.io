import type { ChangeEvent } from 'react'
import { useEffect, useMemo, useState } from 'react'
import './App.css'

const MAX_TEXT_LENGTH = 60000
const MAX_FILE_SIZE = 400 * 1024 // ~400 KB
const DEFAULT_TOP_LIMIT = 20

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
  word: string
  count: number
}

type AnalysisResult = {
  totalUnique: number
  totalOccurrences: number
  sortedWords: DifficultWord[]
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

function App() {
  const [inputText, setInputText] = useState('')
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [status, setStatus] = useState<Status | null>(null)
  const [topLimit, setTopLimit] = useState(DEFAULT_TOP_LIMIT)
  const [commonWords, setCommonWords] = useState<Set<string>>(() =>
    buildWordSet(FALLBACK_COMMON_WORDS),
  )
  const [isLoadingCommonWords, setIsLoadingCommonWords] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadCommonWords = async () => {
      try {
        const response = await fetch('/data/google-10000-english-usa.txt')
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

  const characterCount = inputText.length

  const displayedWords = useMemo(() => {
    if (!analysis) {
      return []
    }

    return analysis.sortedWords.slice(0, Math.max(1, topLimit))
  }, [analysis, topLimit])

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

  const handleAnalyze = () => {
    if (!inputText.trim()) {
      setAnalysis(null)
      setStatus({
        type: 'error',
        text: 'Please paste text or upload a file before running the analysis.',
      })
      return
    }

    const normalized = inputText.toLowerCase()
    const tokens = normalized.match(/[a-z]+(?:'[a-z]+)?/g) ?? []
    const difficultWords = new Map<string, number>()

    tokens.forEach((token) => {
      if (commonWords.has(token)) {
        return
      }
      difficultWords.set(token, (difficultWords.get(token) ?? 0) + 1)
    })

    const sortedWords = Array.from(difficultWords.entries())
      .sort((a, b) => {
        if (b[1] === a[1]) {
          return a[0].localeCompare(b[0])
        }
        return b[1] - a[1]
      })
      .map(([word, count]) => ({ word, count }))

    setAnalysis({
      totalUnique: difficultWords.size,
      totalOccurrences: Array.from(difficultWords.values()).reduce(
        (total, current) => total + current,
        0,
      ),
      sortedWords,
    })

    setStatus({
      type: 'info',
      text:
        sortedWords.length === 0
          ? 'All of the words in the sample are part of the common word list.'
          : 'Analysis complete. Focus on the most frequent difficult words below.',
    })
  }

  const handleClear = () => {
    setInputText('')
    setAnalysis(null)
    setStatus(null)
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
            </div>

            {displayedWords.length ? (
              <>
                <p className="list-caption">
                  Top {displayedWords.length} most frequent difficult words. Learn these
                  first for the biggest payoff.
                </p>
                <ol className="words-list">
                  {displayedWords.map((item, index) => (
                    <li key={item.word}>
                      <span className="rank">{index + 1}.</span>
                      <span className="word">{item.word}</span>
                      <span className="count">{item.count}×</span>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <p className="empty-state">
                Every word in your sample belongs to the common word list. Try a different
                passage or load a more advanced text.
              </p>
            )}
          </>
        ) : (
          <p className="empty-state">
            Run an analysis to see how many unfamiliar words appear in your source text.
          </p>
        )}
      </section>
    </div>
  )
}

export default App
