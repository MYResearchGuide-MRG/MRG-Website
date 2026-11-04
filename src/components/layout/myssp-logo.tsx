import { siteConfig } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * Full MYSSP logo (triangles and name). Both colourways are rendered and the
 * theme class picks one, since the black and white files are separate artwork
 * rather than an inversion of each other.
 */
export function MysspLogo({
  className,
  alt = "Malaysia Science Scholar's Programme",
}: {
  className?: string
  alt?: string
}) {
  const decorative = alt === ""
  return (
    <>
      <img
        src={siteConfig.mysspLogoLightUrl}
        alt={alt}
        aria-hidden={decorative || undefined}
        width={1200}
        height={299}
        className={cn("block dark:hidden", className)}
      />
      <img
        src={siteConfig.mysspLogoUrl}
        alt={alt}
        aria-hidden={decorative || undefined}
        width={1200}
        height={298}
        className={cn("hidden dark:block", className)}
      />
    </>
  )
}
