import { definePreset } from '@primeuix/themes'
import Aura from '@primeuix/themes/aura'

/**
 * The palette, in one place.
 *
 * The app draws its own chrome — the typing line, the on-screen keyboard, the
 * heatmap — but the dialogs, buttons and selects come from PrimeVue. A preset is
 * what keeps those two halves the same colour: every `--p-*` variable the
 * components read is derived from the ramps below, so there is no second palette
 * to keep in sync and no component arriving in stock Aura blue.
 *
 * The ramps are the monkeytype-style scheme from the design: a near-black
 * neutral, one muted step above it for surfaces, dimmed text for anything not
 * being typed right now, and a single teal accent that marks exactly one thing —
 * what to do next.
 */

/** The accent. `500` is the design's `#3fc6b4`; the rest is a ramp around it. */
const teal = {
  50: '#edfbf8',
  100: '#d0f5ee',
  200: '#a6ece0',
  300: '#74e0ce',
  400: '#4fd2bf',
  500: '#3fc6b4',
  600: '#2fa695',
  700: '#268577',
  800: '#1f665c',
  900: '#174a43',
  950: '#0e2e2a',
}

/**
 * The dark neutrals, and the scheme the design is drawn in.
 *
 * Named by position on the ramp rather than by role because they carry several
 * roles each: `200` is body text, `800` is a key cap, `950` is the page.
 *
 * The mid steps are the one place this departs from the design, and knowingly.
 * The design greys its untyped drill text to `#62636a` — 2.5:1 on the page — and
 * its captions to `#4a4b4e`, which is dimmer still. That reads beautifully at
 * 48px and is unreadable at 11px, and the app has far more small text than the
 * mockup did. So the ramp is pulled up until each step clears the bar for the
 * size it is actually used at: `500` to 3.1:1 for the drill line, `400` to
 * 4.6:1 and `300` to 6.6:1 for labels. The hue and the hierarchy are the
 * design's; only the luminance moved. See the `--kt-*` roles in `main.css`.
 */
const darkSurface = {
  0: '#ffffff',
  50: '#f4f4f2',
  100: '#e3e2dc',
  200: '#d1d0c5',
  300: '#adaca3',
  400: '#97979c',
  500: '#707177',
  600: '#4a4b4e',
  700: '#3a3c40',
  800: '#2e3033',
  900: '#2a2c2f',
  950: '#262629',
}

/**
 * The light neutrals — warm rather than blue, so the two schemes read as one
 * design rather than as a theme and its inversion.
 *
 * The mid steps mirror the dark ramp's split and land on the same ratios: `400`
 * recedes for the drill line at 3.1:1, `500` and `600` carry small text at 5.0:1
 * and 6.1:1. The design never had to solve this scheme — it only ever ran dark.
 */
const lightSurface = {
  0: '#ffffff',
  50: '#f7f5f0',
  100: '#eceae4',
  200: '#e2dfd6',
  300: '#d5d1c6',
  400: '#848580',
  500: '#62635e',
  600: '#55565a',
  700: '#45464b',
  800: '#3a3b40',
  900: '#2f3035',
  950: '#26272b',
}

export const KhmerTypePreset = definePreset(Aura, {
  primitive: {
    borderRadius: {
      none: '0',
      xs: '2px',
      sm: '3px',
      md: '4px',
      lg: '6px',
      xl: '10px',
    },
  },
  semantic: {
    primary: teal,
    /* Flat: the design has no lifted surfaces, so nothing casts a shadow. */
    formField: {
      borderRadius: '{border.radius.md}',
      focusRing: {
        width: '1px',
        style: 'solid',
        color: '{primary.color}',
        offset: '1px',
        shadow: 'none',
      },
    },
    colorScheme: {
      light: {
        surface: lightSurface,
        /*
         * Several steps deeper than the accent used on dark. The design's
         * `#3fc6b4` is 2.5:1 on a pale surface — fine as a fill, unreadable as
         * the 11px label text the design puts it in. `800` measures 5.6:1 on
         * the page and 5.1:1 on a key cap, so the same accent can do both jobs
         * here that one colour does in the dark scheme.
         */
        primary: {
          color: '{primary.800}',
          contrastColor: '{surface.0}',
          hoverColor: '{primary.900}',
          activeColor: '{primary.950}',
        },
        text: {
          color: '{surface.900}',
          hoverColor: '{surface.950}',
          mutedColor: '{surface.600}',
          hoverMutedColor: '{surface.700}',
        },
        content: {
          background: '{surface.100}',
          hoverBackground: '{surface.200}',
          borderColor: '{surface.300}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}',
        },
        overlay: {
          select: { background: '{surface.50}', borderColor: '{surface.300}' },
          popover: { background: '{surface.50}', borderColor: '{surface.300}' },
          modal: { background: '{surface.50}', borderColor: '{surface.300}' },
        },
        formField: {
          background: '{surface.200}',
          filledBackground: '{surface.200}',
          borderColor: '{surface.300}',
          hoverBorderColor: '{surface.400}',
          color: '{text.color}',
          placeholderColor: '{surface.500}',
        },
        mask: { background: 'rgba(38, 39, 43, 0.55)' },
      },
      dark: {
        surface: darkSurface,
        primary: {
          color: '{primary.500}',
          /* Ink on an accent fill is the page, not white — see the design's
             next-key cap. */
          contrastColor: '{surface.950}',
          hoverColor: '{primary.400}',
          activeColor: '{primary.600}',
        },
        text: {
          color: '{surface.200}',
          hoverColor: '{surface.100}',
          mutedColor: '{surface.300}',
          hoverMutedColor: '{surface.200}',
        },
        content: {
          background: '{surface.800}',
          hoverBackground: '{surface.700}',
          borderColor: '{surface.700}',
          color: '{text.color}',
          hoverColor: '{text.hover.color}',
        },
        overlay: {
          select: { background: '{surface.800}', borderColor: '{surface.700}' },
          popover: { background: '{surface.800}', borderColor: '{surface.700}' },
          modal: { background: '{surface.800}', borderColor: '{surface.700}' },
        },
        formField: {
          background: '{surface.800}',
          filledBackground: '{surface.800}',
          borderColor: '{surface.700}',
          hoverBorderColor: '{surface.600}',
          color: '{text.color}',
          placeholderColor: '{surface.500}',
        },
        mask: { background: 'rgba(20, 20, 22, 0.65)' },
      },
    },
  },
})
