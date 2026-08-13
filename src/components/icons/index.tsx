import * as React from "react"

import type { AnimatedIconHandle } from "./types"
import type { IconComponent } from "./icon-map"

/**
 * Plays an itshover icon's animation in response to a parent's hover state.
 *
 * The icons animate on their own `onHoverStart`, which would mean the pointer
 * had to land on the 20px glyph itself. Driving them through the imperative
 * handle lets a whole row or card be the trigger.
 */
export function AnimatedIcon({
  icon: Icon,
  active = false,
  size = 20,
  strokeWidth = 1.5,
  className,
}: {
  icon: IconComponent
  active?: boolean
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const ref = React.useRef<AnimatedIconHandle>(null)

  React.useEffect(() => {
    if (active) ref.current?.startAnimation()
    else ref.current?.stopAnimation()
  }, [active])

  return (
    <Icon
      ref={ref}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
      focusable={false}
    />
  )
}
