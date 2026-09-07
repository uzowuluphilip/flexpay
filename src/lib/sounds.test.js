import test from 'node:test'
import assert from 'node:assert/strict'

import { getSoundsEnabled, setSoundsEnabled } from './sounds.js'

test('sound preference defaults to enabled', () => {
  assert.equal(getSoundsEnabled(), true)
})

test('sound preference persists to localStorage when available', () => {
  const previous = globalThis.localStorage
  globalThis.localStorage = {
    store: {},
    getItem(key) {
      return this.store[key] ?? null
    },
    setItem(key, value) {
      this.store[key] = String(value)
    },
    removeItem(key) {
      delete this.store[key]
    },
  }

  setSoundsEnabled(false)
  assert.equal(getSoundsEnabled(), false)
  setSoundsEnabled(true)
  assert.equal(getSoundsEnabled(), true)

  globalThis.localStorage = previous
})
