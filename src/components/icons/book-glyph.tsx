import * as React from "react"

/**
 * Single-colour book mark, from the book-icon.svg artwork. The original is a
 * navy book with white pages; here the book takes currentColor and the pages
 * are cut out through a mask, so the glyph reads in one colour (white on the
 * hero) over whatever is behind it.
 */
export function BookGlyph({ className }: { className?: string }) {
  const id = React.useId()
  return (
    <svg
      viewBox="59 42 143 168"
      aria-hidden
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <mask id={id}>
        <path
          fill="#fff"
          d="M86 42h89c15 0 27 12 27 27v114c0 15-12 27-27 27H86c-15 0-27-12-27-27V69c0-15 12-27 27-27Z"
        />
        <path
          fill="#000"
          d="M87 56h4v128h-4c-7.18 0-13-5.82-13-13V69c0-7.18 5.82-13 13-13Z"
        />
        <path
          fill="#000"
          d="M105 56h70c7.18 0 13 5.82 13 13v102c0 7.18-5.82 13-13 13h-70V56Z"
        />
        <path fill="#fff" d="M131 87.5h31a7 7 0 0 1 0 14h-31a7 7 0 0 1 0-14Z" />
        <path fill="#fff" d="M124 113h45a7 7 0 0 1 0 14h-45a7 7 0 0 1 0-14Z" />
      </mask>
      <rect
        x="59"
        y="42"
        width="143"
        height="168"
        fill="currentColor"
        mask={`url(#${id})`}
      />
    </svg>
  )
}
