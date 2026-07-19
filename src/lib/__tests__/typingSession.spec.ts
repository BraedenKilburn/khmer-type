import { describe, expect, it } from 'vitest'
import { commitText, emptySession, rewind, withoutLatinLetters } from '@/lib/typingSession'

describe('commitText', () => {
  it('records one keystroke per code point', () => {
    expect(commitText(emptySession, 'ក', 'ក')).toEqual({
      typedText: 'ក',
      cursorIndex: 1,
      keystrokes: ['ក'],
    })
  })

  it('splits a composed sequence into its keystrokes — see docs/adr/0002', () => {
    expect(commitText(emptySession, 'ស្វា', 'ស្វា')).toEqual({
      typedText: 'ស្វា',
      cursorIndex: 4,
      keystrokes: ['ស', '្', 'វ', 'ា'],
    })
  })

  it('records a wrong keystroke rather than refusing it', () => {
    expect(commitText(emptySession, 'ក', 'ខ')).toEqual({
      typedText: 'ខ',
      cursorIndex: 1,
      keystrokes: ['ខ'],
    })
  })

  it('refuses a keystroke past the end of the drill', () => {
    const done = commitText(emptySession, 'ក', 'ក')
    expect(commitText(done, 'ក', 'ខ')).toEqual(done)
  })

  it('stops a composed sequence at the end of the drill', () => {
    expect(commitText(emptySession, 'កខ', 'កខគ')).toEqual({
      typedText: 'កខ',
      cursorIndex: 2,
      keystrokes: ['ក', 'ខ'],
    })
  })

  it('is a no-op for empty text', () => {
    expect(commitText(emptySession, 'ក', '')).toEqual(emptySession)
  })

  it('leaves the session it was given untouched', () => {
    const before = commitText(emptySession, 'កខ', 'ក')
    commitText(before, 'កខ', 'ខ')
    expect(before).toEqual({ typedText: 'ក', cursorIndex: 1, keystrokes: ['ក'] })
  })
})

describe('rewind', () => {
  it('moves the cursor back and drops the code point', () => {
    const typed = commitText(emptySession, 'កខ', 'កខ')
    expect(rewind(typed)).toEqual({
      typedText: 'ក',
      cursorIndex: 1,
      keystrokes: ['ក', 'ខ', 'Backspace'],
    })
  })

  it('records the Backspace at cursor 0 without moving', () => {
    expect(rewind(emptySession)).toEqual({
      typedText: '',
      cursorIndex: 0,
      keystrokes: ['Backspace'],
    })
  })

  it('rewinds into a cluster one code point at a time', () => {
    const typed = commitText(emptySession, 'ស្វា', 'ស្វា')
    expect(rewind(typed).typedText).toBe('ស្វ')
  })

  it('leaves the session it was given untouched', () => {
    const before = commitText(emptySession, 'ក', 'ក')
    rewind(before)
    expect(before.keystrokes).toEqual(['ក'])
  })
})

describe('withoutLatinLetters', () => {
  it('refuses a key pressed on the wrong layout', () => {
    expect(withoutLatinLetters('a')).toBe('')
  })

  it('keeps the Khmer in a partly Latin commit', () => {
    expect(withoutLatinLetters('កab')).toBe('ក')
  })

  it('passes Khmer through untouched', () => {
    expect(withoutLatinLetters('ស្វា')).toBe('ស្វា')
  })

  it('passes punctuation and spaces through', () => {
    expect(withoutLatinLetters(' !។')).toBe(' !។')
  })
})
