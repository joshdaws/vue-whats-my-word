import { twoLetterWords } from './word_lists/twoLetters'
import { threeLetterWords } from './word_lists/threeLetters'
import { fourLetterWords } from './word_lists/fourLetters'
import { fiveLetterWords } from './word_lists/fiveLetters'
import { sixLetterWords } from './word_lists/sixLetters'
import { answers } from './word_lists/answers'

const defaultMessage = ' Using word of the day instead.'

export function getWordOfTheDay() {
  if (location.search) {
    try {
      const query = atob(location.search.slice(1))
      if (query.length !== 5) {
        alert(`Incorrect word length from encoded query. ${defaultMessage}`)
      } else {
        return query
      }
    } catch (e) {
      alert(`Malformed encoded word query. ${defaultMessage}`)
    }
  }

  const now = new Date()
  const start = new Date(2022, 1, 8)
  const diff = Number(now) - Number(start)
  let day = Math.floor(diff / (1000 * 60 * 60 * 24))
  while (day > answers.length) {
    day -= answers.length
  }
  return answers[day]
}

// copied from Wordle source

export const allWords = [
  ...answers,
  ...twoLetterWords,
  ...threeLetterWords,
  ...fourLetterWords,
  ...fiveLetterWords,
  ...sixLetterWords,
]
