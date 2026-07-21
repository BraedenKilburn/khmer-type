import { describe, expect, it } from 'vitest'
import { detectOs } from '@/lib/platform'

describe('detectOs', () => {
  it('reads macOS from a Safari user agent', () => {
    expect(
      detectOs(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
      ),
    ).toBe('macos')
  })

  it('reads Windows from a Chrome user agent', () => {
    expect(
      detectOs(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      ),
    ).toBe('windows')
  })

  it('reads Linux from a Firefox user agent', () => {
    expect(detectOs('Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0')).toBe(
      'linux',
    )
  })

  it('falls back to Linux for a user agent it does not recognise', () => {
    expect(detectOs('')).toBe('linux')
  })

  it('does not read Windows out of the word "Darwin"', () => {
    // `/win/i` would match `Darwin` — macOS has to be decided first.
    expect(detectOs('Mozilla/5.0 (Macintosh; Darwin 23.4.0)')).toBe('macos')
  })
})
