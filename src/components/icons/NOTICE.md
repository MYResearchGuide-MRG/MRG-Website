# Icon attribution

The `*-icon.tsx` files and `types.ts` in this directory are vendored from
[itshover](https://github.com/itshover/itshover), licensed under Apache-2.0.

Local modifications:

- Removed `cursor-pointer` — these render as decorative glyphs, not controls.

Note for anyone vendoring more icons from upstream: check for hardcoded hex
fills before use. The trophy icon (since removed) shipped confetti in
`#FFD700` / `#FF4500` / `#00BFFF` / `#32CD32`, which would be the only colour
on an otherwise monochrome site. Swap any such fills to `currentColor`.

`index.tsx` and `animated-icon` usage are our own, not part of the upstream set.
