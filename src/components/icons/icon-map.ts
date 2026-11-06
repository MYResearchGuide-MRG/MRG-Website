import type * as React from "react"

import type { AnimatedIconHandle, AnimatedIconProps } from "./types"

import BookIcon from "./book-icon"
import ClockIcon from "./clock-icon"
import DoubleCheckIcon from "./double-check-icon"
import FileDescriptionIcon from "./file-description-icon"
import MagnifierIcon from "./magnifier-icon"
import MapPinIcon from "./map-pin-icon"
import RosetteDiscountCheckIcon from "./rosette-discount-check-icon"
import UserCheckIcon from "./user-check-icon"
import UsersGroupIcon from "./users-group-icon"

export type IconComponent = React.ForwardRefExoticComponent<
  AnimatedIconProps & React.RefAttributes<AnimatedIconHandle>
>

/** Keyed by the `icon` field on eligibility requirements. */
export const requirementIcons: Record<string, IconComponent> = {
  calendar: UserCheckIcon,
  graduation: BookIcon,
  map: MapPinIcon,
  users: UsersGroupIcon,
  clock: ClockIcon,
  check: RosetteDiscountCheckIcon,
}

/** Keyed by application step number. */
export const applicationStepIcons: Record<number, IconComponent> = {
  1: MagnifierIcon,
  2: FileDescriptionIcon,
  3: DoubleCheckIcon,
}
