import * as React from "react"

import { GridBackdrop } from "./grid-backdrop"
import { NeuronBackdrop } from "./neuron-backdrop"
import { TextBackdrop } from "./text-backdrop"
import { WavesBackdrop } from "./waves-backdrop"

import { HeroSeal } from "../hero-seal"
import { LatticeFigure } from "../figures/lattice-figure"
import { LazyGlobeFigure } from "../figures/lazy"

type FigureComponent = React.ComponentType<{ className?: string }>

/**
 * Each variant pairs a full-bleed backdrop with an optional figure that fills
 * the empty right half of the hero. Variants whose backdrop already occupies
 * that space (neuron, words) declare no figure.
 */
export const BACKDROPS: ReadonlyArray<{
  id: string
  label: string
  Component: React.ComponentType
  Figure?: FigureComponent
}> = [
  { id: "grid", label: "Seal", Component: GridBackdrop, Figure: HeroSeal },
  { id: "globe", label: "Globe", Component: GridBackdrop, Figure: LazyGlobeFigure },
  {
    id: "lattice",
    label: "Lattice",
    Component: GridBackdrop,
    Figure: LatticeFigure,
  },
  { id: "waves", label: "Waves", Component: WavesBackdrop },
  { id: "neuron", label: "Neuron", Component: NeuronBackdrop },
  { id: "words", label: "Words", Component: TextBackdrop },
]

export type BackdropId = (typeof BACKDROPS)[number]["id"]
