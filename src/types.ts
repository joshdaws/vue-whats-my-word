interface Tile {
  letter: string
  state: LetterState | number
}
interface Row {
  letters: Tile[]
  score: number
}
const enum LetterState {
  INACTIVE = -1,
  ACTIVE = 0,
  CORRECT = 'correct',
  PRESENT = 'present',
  ABSENT = 'absent',
}

export { Tile, LetterState, Row }
