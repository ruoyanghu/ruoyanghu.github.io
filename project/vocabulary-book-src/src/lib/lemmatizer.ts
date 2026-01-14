import nlp from 'compromise'

export type VerbForms = {
  infinitive: string
  present?: string
  past?: string
  participle?: string
}

const VOWELS = /[aeiou]/

const normalizeToken = (word: string) => {
  return word.trim().toLowerCase()
}

const buildRegularPast = (lemma: string) => {
  if (lemma.endsWith('e')) {
    return `${lemma}d`
  }
  if (lemma.endsWith('y') && !VOWELS.test(lemma[lemma.length - 2] ?? '')) {
    return `${lemma.slice(0, -1)}ied`
  }
  return `${lemma}ed`
}

const buildRegularParticiple = buildRegularPast

const isIrregularVerb = (lemma: string, past?: string, participle?: string) => {
  if (!past && !participle) {
    return false
  }
  const expectedPast = buildRegularPast(lemma)
  const expectedPart = buildRegularParticiple(lemma)
  const normalizedPast = past?.toLowerCase()
  const normalizedPart = participle?.toLowerCase()

  const differsFromPast = normalizedPast
    ? normalizedPast !== expectedPast && normalizedPast !== lemma
    : false
  const differsFromPart = normalizedPart
    ? normalizedPart !== expectedPart && normalizedPart !== lemma
    : false

  return differsFromPast || differsFromPart
}

export const lemmatizeWord = (token: string): { lemma: string; verbForms?: VerbForms } => {
  const normalizedToken = normalizeToken(token)
  const doc: any = nlp(normalizedToken)
  const term = doc.termList()[0]
  let lemma = term?.normal ?? normalizedToken

  const verbs: any = doc.verbs()
  if (verbs.found) {
    const conjugations = verbs.conjugate()?.[0] as any
    const infinitive = conjugations?.Infinitive?.toLowerCase()
    if (infinitive) {
      lemma = infinitive
    }
    const past = conjugations?.PastTense?.toLowerCase()
    const participle =
      conjugations?.Participle?.toLowerCase() ?? conjugations?.PastTense?.toLowerCase()
    const present = conjugations?.PresentTense?.toLowerCase()

    if (lemma && isIrregularVerb(lemma, past, participle)) {
      return {
        lemma,
        verbForms: {
          infinitive: lemma,
          present,
          past,
          participle,
        },
      }
    }

    return {
      lemma,
    }
  }

  const nouns: any = doc.nouns()
  if (nouns.found) {
    const conjugations = nouns.conjugate()?.[0] as any
    const singular = conjugations?.Singular?.toLowerCase()
    if (singular) {
      lemma = singular
    } else {
      const singularized = nouns.toSingular().text('normal')
      lemma = singularized ? singularized.toLowerCase() : lemma
    }
  }

  return {
    lemma,
  }
}
