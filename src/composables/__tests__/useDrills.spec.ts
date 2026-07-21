import { describe, expect, it } from 'vitest'
import { stripZwsp } from '@/data/corpus'

const ZWSP = '\u200B'

describe('stripZwsp', () => {
  it('removes a Zero Width Space between two clusters', () => {
    expect(stripZwsp(`ខ្ញុំ${ZWSP}ស្រលាញ់អ្នក`)).toBe('ខ្ញុំស្រលាញ់អ្នក')
  })

  it('removes every Zero Width Space, not just the first', () => {
    expect(stripZwsp(`ក${ZWSP}ខ${ZWSP}គ`)).toBe('កខគ')
  })

  it('leaves a drill without a Zero Width Space untouched', () => {
    expect(stripZwsp('សូមស្វាគមន៏!')).toBe('សូមស្វាគមន៏!')
  })

  it('keeps COENG intact — it is invisible but typed', () => {
    expect(stripZwsp('ស្វា')).toBe('ស្វា')
  })

  it('yields an empty string for an empty drill', () => {
    expect(stripZwsp('')).toBe('')
  })
})
