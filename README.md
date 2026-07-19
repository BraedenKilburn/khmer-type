# Khmer Type

A typing trainer that teaches the Khmer keyboard layout.

**[Try it live → khmer-type.pages.dev](https://khmer-type.pages.dev/)**

Khmer text stacks and combines in ways Latin text does not — `ស្វា` is a single
visual unit built from four keystrokes, one of which (COENG) renders no glyph at
all. Khmer Type draws a drill from its corpus, tracks every keystroke you make
against it, and reports your speed and accuracy when you finish.

Speed is counted in keystrokes rather than clusters, and accuracy is judged at
the moment each keystroke lands — correcting a typo does not restore it. The
reasoning behind those choices lives in [`docs/adr/`](docs/adr/), and the
project's vocabulary is defined in [`CONTEXT.md`](CONTEXT.md).

## Local development

Requires [Bun](https://bun.sh/).

```sh
bun install
bun run dev
```

The dev server prints a local URL to open.

## Tests

```sh
bun run test        # single run
bun run test:watch  # re-run on change
```

## Other scripts

```sh
bun run type-check  # vue-tsc
bun run lint        # oxlint + eslint, both with --fix
bun run format      # prettier over src/
bun run build       # type-check and production build
```

## Deployment

`main` deploys automatically to [Cloudflare Pages](https://khmer-type.pages.dev/)
on every push.
