"use client"

import { useEffect, useRef } from "react"

const VERTEX_SHADER = `
  precision mediump float;

  attribute vec2 a_position;
  attribute vec2 a_uv;
  uniform float u_time;
  uniform float u_intensity;
  varying vec2 v_uv;

  void main() {
    vec2 displaced = a_position;
    displaced.x += sin(a_uv.y * 12.0 + u_time) * 0.018 * u_intensity;
    displaced.y += cos(a_uv.x * 10.0 + u_time * 0.8) * 0.018 * u_intensity;
    v_uv = a_uv;
    gl_Position = vec4(displaced, 0.0, 1.0);
  }
`

const FRAGMENT_SHADER = `
  precision mediump float;

  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_intensity;
  varying vec2 v_uv;

  void main() {
    vec2 uv = v_uv;
    vec2 point = uv - 0.5;
    point.x *= u_resolution.x / u_resolution.y;

    float rawNoise = sin(uv.x * 20.0 + u_time) * cos(uv.y * 15.0 + u_time * 0.8);
    rawNoise += sin(uv.x * 35.0 - u_time * 2.0) * cos(uv.y * 25.0 + u_time * 1.2) * 0.5;

    vec3 sage = vec3(0.867, 0.902, 0.839);
    vec3 paper = vec3(0.957, 0.937, 0.902);
    vec3 clay = vec3(0.800, 0.345, 0.200);
    vec3 moss = vec3(0.180, 0.251, 0.212);

    float centerDistance = length((uv - 0.5) * vec2(1.0, 1.35));
    float centerMask = 1.0 - smoothstep(0.2, 0.58, centerDistance);
    float edgeMask = 1.0 - centerMask;
    float intensityHighlight = pow(abs(rawNoise), 2.0) * u_intensity;
    float broadWave = sin((uv.x * 2.4 + uv.y * 1.7) * 3.14159265 + u_time * 0.9);
    float broadMix = broadWave * 0.5 + 0.5;
    vec2 radialOrigin = vec2(
      0.5 + sin(u_time * 0.42) * 0.34,
      0.5 + cos(u_time * 0.33) * 0.25
    );
    vec2 radialPoint = uv - radialOrigin;
    radialPoint.x *= u_resolution.x / u_resolution.y;
    float radialHighlight = 1.0 - smoothstep(0.08, 0.72, length(radialPoint));

    vec3 color = mix(sage, paper, 0.28 + broadMix * 0.5);
    color = mix(color, paper, radialHighlight * edgeMask * 0.32);
    color = mix(color, paper, clamp(intensityHighlight * 0.16, 0.0, 0.3) * edgeMask);
    color = mix(color, moss, smoothstep(0.1, 0.95, -broadWave) * edgeMask * 0.15);
    color = mix(color, paper, centerMask * 0.94);

    float ringRadius = 0.36 + sin(u_time * 0.55) * 0.025;
    float energyRing = 1.0 - smoothstep(0.012, 0.055, abs(length(point) - ringRadius));
    float ringGate = smoothstep(0.2, 0.36, length(point));
    color = mix(color, clay, energyRing * ringGate * 0.2);

    gl_FragColor = vec4(color, 1.0);
  }
`

function createSubdividedPlane(subdivisions) {
  const vertices = []
  const overscan = 1.04

  for (let y = 0; y < subdivisions; y += 1) {
    for (let x = 0; x < subdivisions; x += 1) {
      const u0 = x / subdivisions
      const v0 = y / subdivisions
      const u1 = (x + 1) / subdivisions
      const v1 = (y + 1) / subdivisions
      const x0 = (u0 * 2 - 1) * overscan
      const y0 = (v0 * 2 - 1) * overscan
      const x1 = (u1 * 2 - 1) * overscan
      const y1 = (v1 * 2 - 1) * overscan

      vertices.push(
        x0, y0, u0, v0,
        x1, y0, u1, v0,
        x0, y1, u0, v1,
        x0, y1, u0, v1,
        x1, y0, u1, v0,
        x1, y1, u1, v1,
      )
    }
  }

  return new Float32Array(vertices)
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
    const gl = canvas?.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      powerPreference: "low-power",
    })

    if (!canvas || !gl) return undefined

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    const program = gl.createProgram()

    if (!vertexShader || !fragmentShader || !program) {
      if (vertexShader) gl.deleteShader(vertexShader)
      if (fragmentShader) gl.deleteShader(fragmentShader)
      if (program) gl.deleteProgram(program)
      return undefined
    }

    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.deleteShader(vertexShader)
    gl.deleteShader(fragmentShader)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program)
      return undefined
    }

    const positionLocation = gl.getAttribLocation(program, "a_position")
    const uvLocation = gl.getAttribLocation(program, "a_uv")
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution")
    const timeLocation = gl.getUniformLocation(program, "u_time")
    const intensityLocation = gl.getUniformLocation(program, "u_intensity")
    const buffer = gl.createBuffer()
    const vertices = createSubdividedPlane(32)

    if (
      positionLocation < 0
      || uvLocation < 0
      || !resolutionLocation
      || !timeLocation
      || !intensityLocation
      || !buffer
    ) {
      if (buffer) gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      return undefined
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW)

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    let animationFrame = 0
    let contextLost = false
    let elapsed = 0
    let lastTimestamp = 0

    const resize = () => {
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio))
      const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio))

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      gl.viewport(0, 0, width, height)
    }

    const draw = (time, intensity = 1) => {
      resize()
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0)
      gl.enableVertexAttribArray(uvLocation)
      gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, 16, 8)
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height)
      gl.uniform1f(timeLocation, time)
      gl.uniform1f(intensityLocation, intensity)
      gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 4)
      canvas.classList.add("hero-shader--ready")
    }

    const animate = (timestamp) => {
      if (document.hidden || motionQuery.matches) return
      if (lastTimestamp) elapsed += Math.min(timestamp - lastTimestamp, 100) / 1000
      lastTimestamp = timestamp
      draw(elapsed * 1.25, 1 + Math.sin(elapsed * 2) * 0.3)
      animationFrame = window.requestAnimationFrame(animate)
    }

    const stop = () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      lastTimestamp = 0
    }

    const start = () => {
      stop()
      if (contextLost) return
      if (motionQuery.matches) {
        draw(0)
      } else if (!document.hidden) {
        animationFrame = window.requestAnimationFrame(animate)
      }
    }

    const handleResize = () => {
      if (contextLost) return
      if (motionQuery.matches) draw(0)
      else resize()
    }

    const handleVisibility = () => {
      if (document.hidden) stop()
      else start()
    }

    const handleContextLost = (event) => {
      event.preventDefault()
      contextLost = true
      stop()
      canvas.classList.remove("hero-shader--ready")
    }

    window.addEventListener("resize", handleResize)
    document.addEventListener("visibilitychange", handleVisibility)
    canvas.addEventListener("webglcontextlost", handleContextLost)
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", start)
    else motionQuery.addListener(start)
    start()

    return () => {
      stop()
      window.removeEventListener("resize", handleResize)
      document.removeEventListener("visibilitychange", handleVisibility)
      canvas.removeEventListener("webglcontextlost", handleContextLost)
      if (motionQuery.removeEventListener) motionQuery.removeEventListener("change", start)
      else motionQuery.removeListener(start)
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-shader" aria-hidden="true" />
}
