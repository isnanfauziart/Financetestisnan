"use client"

import { useEffect, useRef } from "react"

const SHADER_RENDER_SCALE = 0.72
const SHADER_FRAME_INTERVAL = 1000 / 30

const VERTEX_SHADER = `
  attribute vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;

  float hash(vec2 point) {
    return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 point) {
    vec2 cell = floor(point);
    vec2 local = fract(point);
    local = local * local * (3.0 - 2.0 * local);

    return mix(
      mix(hash(cell), hash(cell + vec2(1.0, 0.0)), local.x),
      mix(hash(cell + vec2(0.0, 1.0)), hash(cell + vec2(1.0, 1.0)), local.x),
      local.y
    );
  }

  float fbm(vec2 point) {
    float value = 0.0;
    float amplitude = 0.52;
    for (int index = 0; index < 2; index++) {
      value += amplitude * noise(point);
      point = point * 2.03 + 7.1;
      amplitude *= 0.48;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / max(u_resolution.xy, vec2(1.0));
    vec2 aspect = vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
    float time = u_time * 0.16;

    vec2 flow = uv * aspect * 2.15;
    flow.x += fbm(flow * 0.72 + vec2(time, -time * 0.55)) * 0.48;
    flow.y += fbm(flow * 0.82 + vec2(-time * 0.7, time)) * 0.36;

    float fieldA = smoothstep(0.16, 0.9, fbm(flow + vec2(time * 0.55, 0.0)));
    float fieldB = smoothstep(0.2, 0.92, fbm(flow * 1.08 + vec2(3.8, -time * 0.42)));
    float mintVeil = smoothstep(0.12, 0.95, 1.0 - distance(uv, vec2(0.82, 0.24)));
    float peachVeil = smoothstep(0.05, 0.92, 1.0 - distance(uv, vec2(0.14, 0.62)));

    vec3 paper = vec3(0.973, 0.952, 0.909);
    vec3 mint = vec3(0.663, 0.816, 0.704);
    vec3 sage = vec3(0.392, 0.563, 0.431);
    vec3 peach = vec3(0.914, 0.616, 0.447);
    vec3 moss = vec3(0.125, 0.235, 0.176);

    vec3 color = paper;
    color = mix(color, peach, (fieldA * 0.34 + peachVeil * 0.22));
    color = mix(color, mint, (fieldB * 0.36 + mintVeil * 0.22));
    color = mix(color, sage, smoothstep(0.58, 0.9, fieldA + fieldB) * 0.16);
    color = mix(color, moss, smoothstep(0.78, 1.22, fieldA + fieldB) * 0.08);

    float highlight = pow(max(0.0, 1.0 - distance(uv, vec2(0.52, 0.38))), 3.0);
    color += vec3(1.0, 0.985, 0.94) * highlight * 0.12;

    gl_FragColor = vec4(color, 0.88);
  }
`

export function clampShaderPixelRatio(pixelRatio = 1) {
  return Math.min(Math.max(pixelRatio || 1, 1), 1)
}

export function shouldAnimateShader({ reducedMotion, hidden, visible = true }) {
  return !reducedMotion && !hidden && visible
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }

  return shader
}

export default function HeroShader() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let gl = null
    let program = null
    let buffer = null
    let resolutionUniform = null
    let timeUniform = null
    let frameId = null
    let resizeObserver = null
    let intersectionObserver = null
    let startedAt = null
    let lastDrawAt = Number.NEGATIVE_INFINITY
    let isVisible = true
    let contextLost = false
    let disposed = false

    const stop = () => {
      if (frameId !== null) cancelAnimationFrame(frameId)
      frameId = null
    }

    const destroyResources = () => {
      if (!gl) return
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      buffer = null
      program = null
      resolutionUniform = null
      timeUniform = null
    }

    const resize = () => {
      if (!gl) return
      const ratio = clampShaderPixelRatio(window.devicePixelRatio)
      const width = Math.max(1, Math.round((canvas.clientWidth || window.innerWidth) * ratio * SHADER_RENDER_SCALE))
      const height = Math.max(1, Math.round((canvas.clientHeight || window.innerHeight) * ratio * SHADER_RENDER_SCALE))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      gl.viewport(0, 0, width, height)
    }

    const drawFrame = (timestamp = 0) => {
      if (disposed || contextLost || !gl || !program) return
      if (startedAt === null) startedAt = timestamp

      gl.useProgram(program)
      gl.uniform2f(resolutionUniform, canvas.width, canvas.height)
      gl.uniform1f(timeUniform, (timestamp - startedAt) / 1000)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
      canvas.classList.add("is-ready")
    }

    const renderFrame = (timestamp = 0) => {
      frameId = null
      if (disposed || contextLost || !gl || !program) return
      if (!shouldAnimateShader({ reducedMotion: mediaQuery.matches, hidden: document.hidden, visible: isVisible })) return

      if (timestamp - lastDrawAt >= SHADER_FRAME_INTERVAL) {
        lastDrawAt = timestamp
        drawFrame(timestamp)
      }

      frameId = requestAnimationFrame(renderFrame)
    }

    const schedule = () => {
      stop()
      if (disposed || contextLost) return
      if (shouldAnimateShader({ reducedMotion: mediaQuery.matches, hidden: document.hidden, visible: isVisible })) {
        frameId = requestAnimationFrame(renderFrame)
      } else if (!document.hidden && isVisible && mediaQuery.matches) {
        drawFrame(0)
      }
    }

    const initialize = () => {
      destroyResources()
      canvas.classList.remove("is-ready")
      gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: false,
        depth: false,
        premultipliedAlpha: true,
      })
      if (!gl) return

      const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
      if (!vertexShader) return
      const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
      if (!fragmentShader) {
        gl.deleteShader(vertexShader)
        return
      }

      program = gl.createProgram()
      if (!program) {
        gl.deleteShader(vertexShader)
        gl.deleteShader(fragmentShader)
        return
      }
      gl.attachShader(program, vertexShader)
      gl.attachShader(program, fragmentShader)
      gl.linkProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)

      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        destroyResources()
        return
      }

      buffer = gl.createBuffer()
      if (!buffer) {
        destroyResources()
        return
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      )

      const position = gl.getAttribLocation(program, "a_position")
      resolutionUniform = gl.getUniformLocation(program, "u_resolution")
      timeUniform = gl.getUniformLocation(program, "u_time")
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      resize()
      schedule()
    }

    const handleVisibility = () => {
      if (document.hidden) stop()
      else schedule()
    }
    const handleMotionChange = () => schedule()
    const handleIntersection = ([entry]) => {
      const nextVisible = Boolean(entry?.isIntersecting)
      if (nextVisible === isVisible) return
      isVisible = nextVisible
      schedule()
    }
    const handleContextLost = (event) => {
      event.preventDefault()
      contextLost = true
      stop()
      canvas.classList.remove("is-ready")
    }
    const handleContextRestored = () => {
      contextLost = false
      startedAt = null
      initialize()
    }

    canvas.addEventListener("webglcontextlost", handleContextLost)
    canvas.addEventListener("webglcontextrestored", handleContextRestored)
    document.addEventListener("visibilitychange", handleVisibility)
    mediaQuery.addEventListener?.("change", handleMotionChange)

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resize)
      resizeObserver.observe(canvas)
    } else {
      window.addEventListener("resize", resize)
    }

    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(handleIntersection, { rootMargin: "120px 0px" })
      intersectionObserver.observe(canvas)
    }

    initialize()

    return () => {
      disposed = true
      stop()
      resizeObserver?.disconnect()
      intersectionObserver?.disconnect()
      window.removeEventListener("resize", resize)
      document.removeEventListener("visibilitychange", handleVisibility)
      mediaQuery.removeEventListener?.("change", handleMotionChange)
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      canvas.removeEventListener("webglcontextrestored", handleContextRestored)
      destroyResources()
    }
  }, [])

  return (
    <div className="hero-shader" data-hero-shader="" aria-hidden="true">
      <canvas ref={canvasRef} />
    </div>
  )
}
