import * as React from "react"
import { useReducedMotion } from "motion/react"

/**
 * Animated cellular texture, after Vanta.js's CELLS effect (color1 #193939,
 * color2 #47475c, size 1.5, speed 1): a slate-teal field of soft cloudy
 * blobs, packed with small dark cells, all slowly churning.
 *
 * Written as one fragment shader on raw WebGL rather than pulling in Vanta and
 * three.js (~600 kB) for a single full-screen quad. The texture is ring-shaped
 * Worley (cellular) noise at three scales multiplied together and drifting at
 * different speeds, as in Vanta's own shader.
 *
 * The pointer nudges the field a little (Vanta's mouseControls). Honours
 * prefers-reduced-motion with a single still frame, and stops drawing while
 * scrolled out of view. Without WebGL the host's background colour shows.
 */

const VERT = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;
uniform vec2 mouse;

const vec3 COLOR1 = vec3(0.098, 0.224, 0.224); // #193939
const vec3 COLOR2 = vec3(0.278, 0.278, 0.361); // #47475c

float length2(vec2 p) { return dot(p, p); }

float hash(vec2 p) {
  return fract(sin(fract(sin(p.x) * 43.13311) + p.y) * 31.0011);
}

// Ring-shaped Worley falloff: bright on a band around each feature point and
// dark at its centre, which is what gives each cell its dark pit.
float worley(vec2 p) {
  float d = 1e30;
  for (int xo = -1; xo <= 1; xo++) {
    for (int yo = -1; yo <= 1; yo++) {
      vec2 tp = floor(p) + vec2(float(xo), float(yo));
      d = min(d, length2(p - tp - vec2(hash(tp))));
    }
  }
  return 3.0 * exp(-4.0 * abs(2.5 * d - 1.0));
}

// Three scales multiplied together: big clouds, mid clusters, fine pits.
float fworley(vec2 p) {
  return sqrt(sqrt(sqrt(
    worley(p * 5.0 + 0.05 * t) *
    sqrt(worley(p * 50.0 + 0.12 - 0.1 * t)) *
    sqrt(sqrt(worley(p * -10.0 + 0.03 * t)))
  )));
}

void main() {
  vec2 uv = gl_FragCoord.xy / res.y;
  uv += mouse * 0.03;

  // Sized so the fine pits read at about 1/30 of the panel height.
  vec2 p = uv * 0.55;
  float v = fworley(p);
  // Vanta darkens toward the lower left; kept, but at half strength.
  v *= mix(1.0, exp(-length2(abs(0.7 * (gl_FragCoord.xy / res) - 1.0))), 0.5);

  vec3 col = mix(COLOR1 * 0.5, COLOR2 * 1.05, smoothstep(0.25, 1.1, v));
  col *= 0.65 + 0.6 * v;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(sh))
    return null
  }
  return sh
}

export function CellsBackdrop() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  React.useEffect(() => {
    const canvas = canvasRef.current
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false })
    if (!canvas || !gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    )
    const loc = gl.getAttribLocation(prog, "p")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, "res")
    const uT = gl.getUniformLocation(prog, "t")
    const uMouse = gl.getUniformLocation(prog, "mouse")

    // Pointer offset from the centre, eased so the field drifts, not jumps.
    const target = { x: 0, y: 0 }
    const eased = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      target.x = (e.clientX - r.left) / r.width - 0.5
      target.y = 0.5 - (e.clientY - r.top) / r.height
    }
    window.addEventListener("pointermove", onMove, { passive: true })

    const frame = (seconds: number) => {
      eased.x += (target.x - eased.x) * 0.03
      eased.y += (target.y - eased.y) * 0.03
      gl.uniform1f(uT, seconds)
      gl.uniform2f(uMouse, eased.x, eased.y)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }

    // A full-screen shader is fill-rate bound, so the backing store is capped
    // at 1.5x rather than the display's full pixel ratio.
    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(width * dpr))
      canvas.height = Math.max(1, Math.floor(height * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
      gl.uniform2f(uRes, canvas.width, canvas.height)
    }
    fit()
    const ro = new ResizeObserver(() => {
      fit()
      if (reduced) frame(0)
    })
    ro.observe(canvas)

    if (reduced) {
      frame(0)
      return () => {
        ro.disconnect()
        window.removeEventListener("pointermove", onMove)
      }
    }

    let raf = 0
    let visible = true
    const start = performance.now()
    const loop = (now: number) => {
      if (visible) frame((now - start) / 1000)
      raf = requestAnimationFrame(loop)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      window.removeEventListener("pointermove", onMove)
    }
  }, [reduced])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 block h-full w-full bg-[#162a2c]"
    />
  )
}
