import type * as React from "react"

import type { AnimatedIconHandle, AnimatedIconProps } from "./types"

import BookIcon from "./book-icon"
import BrainCircuitIcon from "./brain-circuit-icon"
import ChartLineIcon from "./chart-line-icon"
import ClockIcon from "./clock-icon"
import CpuIcon from "./cpu-icon"
import DoubleCheckIcon from "./double-check-icon"
import FileDescriptionIcon from "./file-description-icon"
import LibraryIcon from "./library-icon"
import MagnifierIcon from "./magnifier-icon"
import MapPinIcon from "./map-pin-icon"
import RosetteDiscountCheckIcon from "./rosette-discount-check-icon"
import ScanHeartIcon from "./scan-heart-icon"
import UploadIcon from "./upload-icon"
import UserCheckIcon from "./user-check-icon"
import UserPlusIcon from "./user-plus-icon"
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
  2: UserPlusIcon,
  3: FileDescriptionIcon,
  4: UploadIcon,
  5: DoubleCheckIcon,
}

/** Keyed by research track name — the form's "Project Field" values. */
export const trackIcons: Record<string, IconComponent> = {
  "AI & Computer Sciences": BrainCircuitIcon,
  Biology: ScanHeartIcon,
  Chemistry: CpuIcon,
  Mathematics: ChartLineIcon,
  "Interdisciplinary & Social Sciences": LibraryIcon,
}
