import { defineStore } from 'pinia'
import { useStorage } from '@vueuse/core'
import { Tile } from '../types'

const activeTiles = [
  [1, 1, 0, 0, 0, 0],
  [1, 1, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 0],
  [0, 0, 0, 1, 1, 1],
  [0, 0, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [0, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1],
]

function getNewBoard() {
  return Array.from({ length: 11 }, (v, r) => ({
    letters: Array.from(
      { length: 6 },
      (v, t) =>
        <Tile>{
          letter: '',
          state: activeTiles[r][t] - 1,
        }
    ),
    score: 0,
    hint: false,
  }))
}

export const useGameStore = defineStore('GameStore', {
  state: () => ({
    board: useStorage('board', getNewBoard()),
    currentRowIndex: useStorage('currentRowIndex', 0),
    firstTime: useStorage('first-time', true),
    gameOver: useStorage('gameOver', false),
    grid: useStorage('grid', ''),
    message: useStorage('message', ''),
    success: useStorage('success', false),
  }),

  getters: {
    currentRow: (state) => state.board[state.currentRowIndex],
    totalScore: (state) => state.board.reduce((a, b) => a + b.score, 0),
  },

  actions: {
    resetGame() {
      this.board = getNewBoard()
      this.currentRowIndex = 0
      this.gameOver = false
      this.grid = ''
      this.message = ''
      this.success = false
    },
  },
})
