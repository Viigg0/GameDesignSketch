// pedal-timing
// Visualizes the alternating left/right pedal mechanic: a crank sweeps around
// a circle (0deg = top, clockwise). Each pedal has its own window centered
// 180deg apart (right at 3 o'clock, left at 9 o'clock, mirroring where each
// foot actually pushes down on a real crank). Hold the matching arrow key
// while the crank is in that window to build speed; hold it outside the
// window and speed bleeds instead.
//
// The two windows are wider than a half-circle each, so they overlap near
// the top and bottom transition points instead of meeting at a hard cutoff --
// that overlap is what makes switching pedals feel gradual rather than a
// binary flip. overlapPercent (0-40) controls how wide that blend zone is;
// 0 means the windows exactly tile with no gap and no overlap.

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')

const speedValEl = document.getElementById('speedVal')
const speedBarEl = document.getElementById('speedBar')
const cadenceValEl = document.getElementById('cadenceVal')
const overlapValEl = document.getElementById('overlapVal')

function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
resize()
window.addEventListener('resize', resize)

// Tune these live (see key bindings below) or edit the defaults to test feel.
let rotationSpeed = 90 // degrees/sec the crank sweeps -- stand-in for gear/cadence
let overlapPercent = 30 // how far (as % of a 90deg half) each window bleeds past its natural boundary; capped at 40
const HOLD_GAIN_PER_SEC = 20 // speed gained per second spent correctly holding through a window
const HOLD_PENALTY_PER_SEC = 15 // speed lost per second spent holding a side outside its window
const DECAY_PER_SEC = 6 // speed bled off per second just from coasting
const MAX_SPEED = 100

let angle = 0 // 0 = top, clockwise, 0-360
let speed = 0
let shake = 0
const particles = []
const held = { left: false, right: false }

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2
    const s = 1 + Math.random() * 3
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, color })
  }
}

function windowHalfWidth() {
  return 90 * (1 + overlapPercent / 100)
}

function inWindow(side) {
  const center = side === 'right' ? 90 : 270
  let diff = Math.abs(angle - center)
  if (diff > 180) diff = 360 - diff
  return diff <= windowHalfWidth()
}

function crankPoint(radius) {
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const theta = ((angle - 90) * Math.PI) / 180
  return { x: cx + Math.cos(theta) * radius, y: cy + Math.sin(theta) * radius }
}

window.addEventListener('keydown', (e) => {
  if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', '[', ']'].includes(e.key)) {
    e.preventDefault()
  }
  if (e.key === 'ArrowRight') held.right = true
  if (e.key === 'ArrowLeft') held.left = true
  if (e.repeat) return
  if (e.key === 'ArrowUp') rotationSpeed = Math.min(360, rotationSpeed + 10)
  if (e.key === 'ArrowDown') rotationSpeed = Math.max(10, rotationSpeed - 10)
  if (e.key === '[') overlapPercent = Math.max(0, overlapPercent - 5)
  if (e.key === ']') overlapPercent = Math.min(40, overlapPercent + 5)
})

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowRight') held.right = false
  if (e.key === 'ArrowLeft') held.left = false
})

// Losing window focus mid-hold (alt-tab, etc.) shouldn't leave a key stuck "held".
window.addEventListener('blur', () => {
  held.left = false
  held.right = false
})

let particleTimer = 0
let last = performance.now()
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  angle = (angle + rotationSpeed * dt) % 360

  let boostRight = false
  let boostLeft = false
  let penalizing = false
  for (const side of ['left', 'right']) {
    if (!held[side]) continue
    if (inWindow(side)) {
      speed = Math.min(MAX_SPEED, speed + HOLD_GAIN_PER_SEC * dt)
      if (side === 'right') boostRight = true
      else boostLeft = true
    } else {
      speed = Math.max(0, speed - HOLD_PENALTY_PER_SEC * dt)
      penalizing = true
    }
  }
  speed = Math.max(0, speed - DECAY_PER_SEC * dt)

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const r = Math.min(canvas.width, canvas.height) * 0.28

  particleTimer += dt
  if (particleTimer > 0.05) {
    particleTimer = 0
    const p = crankPoint(r)
    if (boostRight && boostLeft) {
      spawnParticles(p.x, p.y, '#4caf50', 4)
    } else if (boostRight) {
      spawnParticles(p.x, p.y, '#e0b84b', 3)
    } else if (boostLeft) {
      spawnParticles(p.x, p.y, '#4bb8e0', 3)
    } else if (penalizing) {
      spawnParticles(p.x, p.y, '#c94b4b', 2)
    }
    if (boostRight || boostLeft) shake = Math.max(shake, 1.5)
  }

  ctx.fillStyle = '#111'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  if (shake > 0.2) {
    const dx = (Math.random() - 0.5) * shake
    const dy = (Math.random() - 0.5) * shake
    ctx.translate(dx, dy)
    shake *= 0.85
  } else {
    shake = 0
  }

  // One ring, color-coded by zone: amber where only the right pedal counts,
  // blue where only the left counts, green where the two windows overlap and
  // either one counts. `extra` is how far past the natural 90/270 boundary
  // each window bleeds -- zero when overlapPercent is 0, so the green zones
  // collapse to nothing and this degenerates back to a plain half/half ring.
  const extra = Math.max(0, windowHalfWidth() - 90)
  const toRad = (deg) => ((deg - 90) * Math.PI) / 180
  ctx.lineWidth = r * 0.26

  ctx.strokeStyle = '#e0b84b'
  ctx.beginPath()
  ctx.arc(cx, cy, r, toRad(extra), toRad(180 - extra))
  ctx.stroke()

  ctx.strokeStyle = '#4bb8e0'
  ctx.beginPath()
  ctx.arc(cx, cy, r, toRad(180 + extra), toRad(360 - extra))
  ctx.stroke()

  if (extra > 0) {
    ctx.strokeStyle = '#4caf50'
    ctx.beginPath()
    ctx.arc(cx, cy, r, toRad(-extra), toRad(extra))
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy, r, toRad(180 - extra), toRad(180 + extra))
    ctx.stroke()
  }

  // Arrow legend inside the ring: which key goes with which side.
  ctx.font = `${Math.round(r * 0.55)}px -apple-system, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = 'rgba(75,184,224,0.5)'
  ctx.fillText('←', cx - r * 0.45, cy)
  ctx.fillStyle = 'rgba(224,184,75,0.5)'
  ctx.fillText('→', cx + r * 0.45, cy)

  // Crank marker -- red while actively penalized.
  const { x: px, y: py } = crankPoint(r)
  ctx.fillStyle = penalizing && !boostRight && !boostLeft ? '#c94b4b' : '#eaeaea'
  ctx.beginPath()
  ctx.arc(px, py, 10, 0, Math.PI * 2)
  ctx.fill()

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.1
    p.life -= 0.03
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    ctx.globalAlpha = p.life
    ctx.fillStyle = p.color
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()

  speedValEl.textContent = speed.toFixed(0)
  speedBarEl.style.width = `${(speed / MAX_SPEED) * 100}%`
  cadenceValEl.textContent = `${rotationSpeed}°/s`
  overlapValEl.textContent = `${overlapPercent}%`

  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
