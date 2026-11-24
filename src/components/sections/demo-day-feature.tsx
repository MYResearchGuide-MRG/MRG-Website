import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Play } from "lucide-react"
import { Reveal } from "@/components/motion/reveal"
import { libraryHash } from "@/components/projectboard/paths"
import action from "@/components/ui/action-motion.module.css"

const videoId = "PhAiihCnG_M"

export function DemoDayFeature() {
  const [playing, setPlaying] = useState(false)
  const frame = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (playing) frame.current?.focus({ preventScroll: true })
  }, [playing])

  return (
    <section id="demo-day" className="section-y scroll-mt-24" aria-labelledby="demo-day-heading">
      <div className="content-container grid items-center gap-6 md:grid-cols-[minmax(17rem,0.85fr)_minmax(0,1.65fr)] md:gap-8 lg:gap-[52px]">
        <Reveal className="@container flex flex-col gap-5">
          <header>
            <h2 id="demo-day-heading" className="display-lg">Demo Day 2026</h2>
            <div className="mt-3 text-sm leading-relaxed">
              <time dateTime="2026-11-28" className="block font-medium">Saturday, 28 November 2026</time>
              <span className="text-muted-foreground">12:00 pm to 6:00 pm MYT · Online</span>
            </div>
          </header>
          <p className="max-w-[38ch] text-pretty leading-relaxed text-muted-foreground">
            After eight weeks of research, <span className="whitespace-nowrap">13 student teams</span>{" "}
            share their findings and take questions from the judges.
          </p>
          <div className="flex flex-wrap items-center gap-2 @max-[18rem]:gap-1.5">
            <a href="https://luma.com/3kjbktmg" target="_blank" rel="noopener noreferrer"
              className={`btn-light ${action.light} whitespace-nowrap @max-[22rem]:gap-1 @max-[22rem]:px-2`}>
              Event details <ArrowUpRight aria-hidden className="size-[17px] shrink-0 @max-[22rem]:size-4" />
            </a>
            <a href={libraryHash}
              className={`btn-dark ${action.dark} whitespace-nowrap @max-[22rem]:gap-1 @max-[22rem]:px-2`}>
              Project Archive <ArrowUpRight aria-hidden className="size-[17px] shrink-0 @max-[22rem]:size-4" />
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.06} className="min-w-0">
          <div className="relative aspect-video overflow-hidden rounded-[5px] border border-border bg-black">
            {playing ? (
              <iframe
                ref={frame}
                className="absolute inset-0 h-full w-full"
                title="MYSSP Demo Day 2026 video"
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Play MYSSP Demo Day 2026 video"
                className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-black"
              >
                <img src="/demo-day-2026.webp" alt="" width={1280} height={720}
                  loading="lazy" decoding="async" className="h-full w-full object-cover" />
                <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white transition-colors group-hover:bg-zinc-800 sm:right-5 sm:bottom-5">
                  <Play size={15} fill="currentColor" aria-hidden /> Play video
                </span>
              </button>
            )}
          </div>
          <a href={`https://youtu.be/${videoId}`} target="_blank" rel="noopener noreferrer"
            className="ml-auto flex min-h-11 w-fit items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
            Watch on YouTube <ArrowUpRight size={13} aria-hidden />
          </a>
        </Reveal>
      </div>
    </section>
  )
}
