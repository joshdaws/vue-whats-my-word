<script setup lang="ts">
import { onUnmounted } from 'vue'
import { getWordOfTheDay, allWords } from './words'
import Keyboard from './Keyboard.vue'
import { LetterState, Row } from './types'
import { XCircleIcon, HelpCircleIcon } from '@vue-icons/feather'
import { RemovableRef, useStorage, useShare, useClipboard } from '@vueuse/core'
import { useGameStore } from './stores/GameStore'

const { share, isSupported: shareSupported } = useShare()

// Get word of the day
const wordOfTheDay = getWordOfTheDay()
const answer = wordOfTheDay.word
const wordNumber = wordOfTheDay.wordNumber + 1
const curWord = useStorage('curWord', 0)

const GameStore = useGameStore()
let { message, grid, success, gameOver, firstTime, board, currentRowIndex } = $(
  GameStore.$state
)
const { currentRow, totalScore } = $(GameStore)
const { text, copy, copied, isSupported } = useClipboard()

if (curWord.value !== wordNumber) {
  curWord.value = wordNumber
  GameStore.resetGame()
}

let shakeRowIndex = $ref(-1)
let instructions = $ref(false)

// Keep track of revealed letters for the virtual keyboard
const letterStates: RemovableRef<
  Record<string, { state: LetterState; revealed: boolean }>
> = useStorage('letterStates', {})

// Handle keyboard input.
let allowInput = true

const onKeyup = (e: KeyboardEvent) => onKey(e.key)

window.addEventListener('keyup', onKeyup)

onUnmounted(() => {
  window.removeEventListener('keyup', onKeyup)
})

function onKey(key: string) {
  if (!allowInput) return
  if (/^[a-zA-Z]$/.test(key)) {
    fillTile(key.toLowerCase())
  } else if (key === 'Backspace') {
    clearTile()
  } else if (key === 'Enter') {
    completeRow()
  }
}

function fillTile(letter: string) {
  for (const tile of currentRow.letters) {
    if (!tile.letter && tile.state === LetterState.ACTIVE) {
      tile.letter = letter
      break
    }
  }
}

function clearTile() {
  for (const tile of [...currentRow.letters].reverse()) {
    if (tile.letter) {
      tile.letter = ''
      break
    }
  }
}

function getHint(row: Row) {
  if (!gameOver && row.score > 0) {
    row.hint = true
    row.score = 0

    row.letters
      .filter((tile) => tile.state !== LetterState.INACTIVE)
      .forEach((tile, i) => {
        letterStates.value[tile.letter].revealed = true
      })
  }
}

function completeRow() {
  const currentActiveTiles = currentRow.letters.filter(
    (tile) => tile.state === LetterState.ACTIVE
  )
  if (currentActiveTiles.every((tile) => tile.letter)) {
    const guess = currentActiveTiles.map((tile) => tile.letter).join('')
    if (!allWords.includes(guess) && guess !== answer) {
      shake()
      showMessage(`Not in word list`)
      return
    }

    const answerLetters: (string | null)[] = answer.split('')
    // first pass: mark correct ones
    currentRow.letters.forEach((tile, i) => {
      if (answerLetters[i] === tile.letter) {
        tile.state = LetterState.CORRECT

        letterStates.value[tile.letter] = {
          state: tile.state,
          revealed: false,
        }
        answerLetters[i] = null
        currentRow.score += 1000
      }
    })
    // second pass: mark the present
    currentRow.letters.forEach((tile) => {
      if (!tile.state && answerLetters.includes(tile.letter)) {
        tile.state = LetterState.PRESENT
        answerLetters[answerLetters.indexOf(tile.letter)] = null
        if (!letterStates.value[tile.letter]) {
          letterStates.value[tile.letter] = {
            state: tile.state,
            revealed: false,
          }
        }
        currentRow.score += 250
      }
    })
    // 3rd pass: mark absent
    currentRow.letters.forEach((tile) => {
      if (tile.state === LetterState.ACTIVE) {
        tile.state = LetterState.ABSENT
        if (!letterStates.value[tile.letter]) {
          letterStates.value[tile.letter] = {
            state: tile.state,
            revealed: false,
          }
        }
      }
    })

    if (currentRow.score === 0) {
      currentRow.revealed = true
      currentRow.letters
        .filter((tile) => tile.state !== LetterState.INACTIVE)
        .forEach((tile) => {
          letterStates.value[tile.letter].revealed = true
        })
    }

    allowInput = false
    if (
      currentRow.letters.every((tile) => tile.state === LetterState.CORRECT)
    ) {
      // yay!
      currentRow.score += 3000
      currentRowIndex++
      setTimeout(() => {
        grid = genResultGrid()
        let message: string
        if (totalScore > 15000) {
          message = 'Genius'
        } else if (totalScore > 10000) {
          message = 'Magnificent'
        } else if (totalScore > 5000) {
          message = 'Great'
        } else {
          message = 'Meh'
        }

        showMessage(message, -1)

        success = true
        gameOver = true
      }, 1600)
    } else if (currentRowIndex < board.length - 1) {
      // go the next row
      currentRowIndex++
      setTimeout(() => {
        allowInput = true
      }, 1600)
    } else {
      // game over :(
      gameOver = true
      setTimeout(() => {
        showMessage(answer.toUpperCase(), -1)
      }, 1600)
    }
  } else {
    shake()
    showMessage('Not enough letters')
  }
}

function showMessage(msg: string, time = 1000) {
  message = msg
  if (time > 0) {
    setTimeout(() => {
      message = ''
    }, time)
  }
}

function shareResults() {
  const msg =
    "What's My Word: " + curWord.value + '\n' + grid + '\n' + location.href
  if (shareSupported) {
    share({
      title: "What's My Word?",
      text: msg,
    })
  } else {
    copy(msg)
  }
}

function shake() {
  shakeRowIndex = currentRowIndex
  setTimeout(() => {
    shakeRowIndex = -1
  }, 1000)
}

const icons = {
  [LetterState.CORRECT]: '🟩',
  [LetterState.PRESENT]: '🟨',
  [LetterState.ABSENT]: '⬜',
  [LetterState.INACTIVE]: '⬛',
}

function genResultGrid() {
  return (
    board
      .slice(0, currentRowIndex + 1)
      .map((row) => {
        return (
          row.letters.map((tile) => icons[tile.state]).join('') +
          ' ' +
          (row.hint ? 'hint' : row.score)
        )
      })
      .join('\n') +
    '\nTotal Score: ' +
    totalScore
  )
}
</script>

<template>
  <Transition>
    <div class="message" v-if="message">
      {{ message }}
      <pre v-if="grid">{{ grid }}</pre>
      <button v-if="gameOver" @click="shareResults()">
        <span v-if="shareSupported">Share</span>
        <span v-else-if="!copied">Share</span>
        <span v-else>Copied to Clipboard!</span>
      </button>
    </div>
  </Transition>

  <Transition>
    <div class="message instructions" v-if="firstTime || instructions">
      <XCircleIcon
        size="25"
        class="close-circle"
        @click="firstTime = instructions = false"
      ></XCircleIcon>
      <p>
        Deduce the daily six-letter word by guessing shorter words to score
        points that will give you clues to the word's letters and their
        position.
      </p>
      <p>
        Correct letter in the wrong location: <strong>250 Points</strong><br />
        Correct letter in the right location: <strong>1,000 Points</strong>
      </p>
      <p>Each guess must be a valid word. Hit the enter button to submit.</p>
      <p>After each guess, your score for that row will be displayed.</p>
      <p>
        At any time, you can tap a row's score to spend those points to display
        the color of the tiles in that row.
      </p>
      <p>
        🟨 - Correct Letter in the wrong location<br />
        🟩 - Correct Letter in the right location
      </p>
      <p>
        <strong>A new word will be available each day!</strong>
      </p>
      <p>
        <em
          >*Based on currently out of print game
          <a
            href="https://boardgamegeek.com/boardgame/4079/whats-my-word"
            target="_blank"
            >What's My Word?</a
          ></em
        >
      </p>
      <p>
        <a href="https://www.youtube.com/watch?v=CKpNrJ30-0M" target="_blank"
          >How to play video</a
        >
      </p>
    </div>
  </Transition>
  <header>
    <h1>What's My Word?</h1>
    <HelpCircleIcon
      class="help-btn"
      size="24"
      @click="instructions = true"
    ></HelpCircleIcon>
  </header>
  <div id="board" :class="[gameOver && 'game-over']">
    <div class="totalScore">Score: {{ totalScore }}</div>
    <div
      v-for="(row, index) in board"
      :class="[
        'row',
        (currentRowIndex > index || success) && 'scored',
        (row.hint || row.revealed) && 'hint',
        shakeRowIndex === index && 'shake',
        success && currentRowIndex === index && 'jump',
      ]"
    >
      <div
        v-for="(tile, index) in row.letters"
        :class="[
          'tile',
          tile.letter && 'filled',
          tile.state !== LetterState.INACTIVE && 'active',
          tile.state !== LetterState.ACTIVE &&
            tile.state !== LetterState.INACTIVE &&
            'revealed',
        ]"
      >
        <div class="front" :style="{ transitionDelay: `${index * 300}ms` }">
          {{ tile.letter }}
        </div>
        <div
          :class="['back', tile.state]"
          :style="{
            transitionDelay: `${index * 300}ms`,
            animationDelay: `${index * 100}ms`,
          }"
        >
          {{ tile.letter }}
        </div>
      </div>
      <div
        @click="getHint(board[index])"
        :class="['score', row.score && 'visible']"
      >
        {{ row.score }}
      </div>
    </div>
  </div>
  <Keyboard @key="onKey" :letter-states="letterStates" />
</template>

<style scoped>
#board {
  display: grid;
  grid-template-rows: repeat(12, 1fr);
  grid-gap: 5px;
  padding: 10px;
  box-sizing: border-box;
  --height: min(560px, calc(var(--vh, 100vh) - 250px));
  height: var(--height);
  width: min(450px, calc(var(--height) / 12 * 8));
  margin: 0px auto;
}
.message {
  position: absolute;
  left: 50%;
  top: 80px;
  color: #fff;
  background-color: rgba(0, 0, 0, 0.85);
  padding: 16px 20px;
  z-index: 2;
  border-radius: 4px;
  transform: translateX(-50%);
  transition: opacity 0.3s ease-out;
  font-weight: 600;
}
.message.v-leave-to {
  opacity: 0;
}

.message pre {
  text-align: left;
}

.instructions {
  width: 80%;
  text-align: left;
  font-size: 14px;
  font-weight: 300;
}
.instructions a,
.instructions a:hover {
  color: darkseagreen;
}
.instructions .close-circle {
  position: absolute;
  top: 10px;
  right: 10px;
}

.instructions p:first-of-type {
  margin-top: 0;
}
.totalScore {
  text-align: left;
  font-size: 1rem;
  line-height: 2rem;
  font-weight: bold;
  vertical-align: middle;
  text-transform: uppercase;
}
.row {
  display: grid;
  grid-template-columns: repeat(6, 1fr) 2fr;
  grid-gap: 5px;
}
.row .score {
  display: none;
  font-size: 1.4rem;
  font-weight: bold;
  vertical-align: middle;
  text-transform: uppercase;
  text-align: right;
  margin: auto 0;
}
.row .score.visible {
  display: inline-block;
}
.tile {
  width: 100%;
  font-size: 2rem;
  line-height: 2rem;
  font-weight: bold;
  vertical-align: middle;
  text-transform: uppercase;
  user-select: none;
  position: relative;
}
.tile.filled {
  animation: zoom 0.2s;
}
.tile .front,
.tile .back {
  box-sizing: border-box;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transition: transform 0.6s;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.tile .front {
  border: 2px solid #d3d6da;
  background-color: #666;
}
.tile.active .front {
  background-color: #fff;
}
.tile.filled .front {
  border-color: #999;
}
.tile .back {
  transform: rotateX(180deg);
}
.tile.revealed .front {
  transform: rotateX(180deg);
}
.tile.revealed .back {
  transform: rotateX(0deg);
}

@keyframes zoom {
  0% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}

.shake {
  animation: shake 0.5s;
}

@keyframes shake {
  0% {
    transform: translate(1px);
  }
  10% {
    transform: translate(-2px);
  }
  20% {
    transform: translate(2px);
  }
  30% {
    transform: translate(-2px);
  }
  40% {
    transform: translate(2px);
  }
  50% {
    transform: translate(-2px);
  }
  60% {
    transform: translate(2px);
  }
  70% {
    transform: translate(-2px);
  }
  80% {
    transform: translate(2px);
  }
  90% {
    transform: translate(-2px);
  }
  100% {
    transform: translate(1px);
  }
}

.jump .tile .back {
  animation: jump 0.5s;
}

@keyframes jump {
  0% {
    transform: translateY(0px);
  }
  20% {
    transform: translateY(5px);
  }
  60% {
    transform: translateY(-25px);
  }
  90% {
    transform: translateY(3px);
  }
  100% {
    transform: translateY(0px);
  }
}

@media (max-height: 680px) {
  .tile {
    font-size: 3vh;
  }
}
</style>
