export type Option = {
  key: string
  text: string
}

export type Question = {
  number: number
  question: string
  code: string | null
  options: Option[]
  answer: string
  explanation: string
}

export type LessonFile = {
  title: string
  topic: string
  sourceUrl: string
  sourceFile: string
  description: string
  questionCount: number
  questions: Question[]
}

export type LessonMeta = {
  id: string
  file: string
  path: string
  title: string
  questionCount: number
}

export type TopicMeta = {
  id: string
  title: string
  blurb: string
  order: number
  questionCount: number
  lessons: LessonMeta[]
}

export type Catalog = {
  title: string
  topicCount: number
  questionCount: number
  topics: TopicMeta[]
}

export type LessonProgress = {
  bestCorrect: number
  bestTotal: number
  completed: boolean
  lastAt: string
}

export type ProgressMap = Record<string, LessonProgress>

export type QuizAnswer = {
  number: number
  selected: string
  correct: boolean
}
