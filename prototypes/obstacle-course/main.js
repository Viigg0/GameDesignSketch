// obstacle-course
// Feel-and-behavior reference for the six vertical-slice obstacles. Bare
// shapes, one canvas, six switchable scenarios sharing the same player/speed/
// scroll plumbing. Not a game -- a way to feel how each obstacle behaves
// before any art exists for it.

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')
const selector = document.getElementById('selector')

function resize() {
  canvas.width = canvas.clientWidth
  canvas.height = canvas.clientHeight
}
window.addEventListener('resize', resize)

// -- shared tuning --------------------------------------------------------
const MAX_SPEED = 100
const MIN_SPEED = 15
const NEUTRAL_SPEED = 55
const ACCEL_RATE = 45 // per second, while holding accelerate
const BRAKE_RATE = 80 // per second, while holding brake
const NEUTRAL_EASE = 18 // per second, drift toward neutral when idle
const STEER_RATE = 220 // px/sec vertical dodge speed
const SCROLL_SCALE = 3.4 // world px scrolled per second, per speed unit
const PLAYER_RADIUS = 13
const LANE_HALF = 85 // default dodge band, half-height around lane center
const GRAZE_PENALTY = 10

const player = { y: 0, speed: NEUTRAL_SPEED }
let playerX = 0
let distance = 0 // world-space distance traveled
const keys = { up: false, down: false, accel: false, brake: false }
let hitFlash = 0 // short player-flicker on a graze
let resetFlash = 0 // brief full-canvas flash on a pass/fail reset
let successFlash = 0 // brief green flash on a clean pass/clear

function laneCenter() {
  return canvas.height / 2
}

function graze(amount) {
  player.speed = Math.max(MIN_SPEED, player.speed - amount)
  hitFlash = 0.15
}

function resetToApproach(worldX) {
  distance = worldX
  player.y = laneCenter()
  resetFlash = 0.35
}

function clearedCleanly() {
  successFlash = 0.25
}

function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  const nx = Math.max(rx, Math.min(cx, rx + rw))
  const ny = Math.max(ry, Math.min(cy, ry + rh))
  return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r
}

function circleCircleHit(ax, ay, ar, bx, by, br) {
  return (ax - bx) ** 2 + (ay - by) ** 2 <= (ar + br) ** 2
}

// -- input ------------------------------------------------------------------
const KEYMAP = {
  ArrowUp: 'up', w: 'up', W: 'up',
  ArrowDown: 'down', s: 'down', S: 'down',
}
window.addEventListener('keydown', (e) => {
  if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault() }
  if (e.key === ' ') { keys.accel = true; e.preventDefault() }
  if (e.key === 'Shift') { keys.brake = true }
})
window.addEventListener('keyup', (e) => {
  if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false
  if (e.key === ' ') keys.accel = false
  if (e.key === 'Shift') keys.brake = false
})
window.addEventListener('blur', () => {
  keys.up = keys.down = keys.accel = keys.brake = false
})

// -- scenario 1: Ruins Debris ------------------------------------------------
// Static blocks at staggered heights. Grazing costs a little speed; the
// pattern loops so weaving is continuous, never a hard stop.
const ruins = {
  label: 'Ruins Debris',
  blocks: [],
  pattern: [-55, 30, -10, 60, -40, 15],
  spacing: 190,
  init() {
    this.blocks = this.pattern.map((offset, i) => ({
      worldX: 260 + i * this.spacing,
      offset,
      hit: false,
    }))
  },
  update() {
    const w = 34, h = 60
    for (const b of this.blocks) {
      const screenX = b.worldX - distance + playerX
      if (screenX < -80) {
        b.worldX += this.spacing * this.pattern.length
        b.hit = false
      }
      const by = laneCenter() + b.offset - h / 2
      const overlapping = circleRectHit(playerX, player.y, PLAYER_RADIUS, screenX - w / 2, by, w, h)
      if (overlapping && !b.hit) {
        graze(GRAZE_PENALTY)
        b.hit = true
      } else if (!overlapping) {
        b.hit = false
      }
    }
  },
  draw() {
    drawLaneGuides()
    const w = 34, h = 60
    ctx.fillStyle = '#8a6d5b'
    for (const b of this.blocks) {
      const screenX = b.worldX - distance + playerX
      const by = laneCenter() + b.offset - h / 2
      ctx.fillRect(screenX - w / 2, by, w, h)
    }
  },
}

// -- scenario 2: Slit in a Hole ----------------------------------------------
// A wall with a narrow, randomly-placed gap -- mostly a steering-precision
// check now. Speed still matters, but indirectly: steering is sluggish at
// full speed and sharpens the harder you brake, so braking is how you buy
// the precision to actually thread the gap rather than a pass/fail gate on
// its own. Missing clips the wall edge (small speed cost), never a reset.
const slit = {
  label: 'Slit in a Hole',
  GAP_HALF: 22,
  RESPAWN_GAP: 620,
  wall: null,
  slideT: 0,
  slideDir: 1,
  randomizeGapY() {
    const maxOffset = LANE_HALF - this.GAP_HALF - 6
    return laneCenter() + (Math.random() * 2 - 1) * maxOffset
  },
  init() {
    this.wall = { worldX: 420, resolved: false, gapY: this.randomizeGapY() }
    this.slideT = 0
  },
  // Steering responsiveness scales with how much you've slowed down: near
  // MAX_SPEED it's sluggish, near MIN_SPEED (hard braking) it's sharp.
  steerMultiplier() {
    const t = (player.speed - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)
    return 1.6 - t * 1.05
  },
  update(dt) {
    const w = this.wall
    if (!w.resolved && distance >= w.worldX) {
      w.resolved = true
      const margin = this.GAP_HALF - PLAYER_RADIUS
      const miss = margin <= 0 || Math.abs(player.y - w.gapY) > margin
      if (miss) {
        graze(10)
        this.slideDir = player.y < w.gapY ? -1 : 1
        this.slideT = 0.35
      } else {
        clearedCleanly()
      }
    }
    if (this.slideT > 0) {
      this.slideT = Math.max(0, this.slideT - dt)
      const k = this.slideT / 0.35
      player.y = w.gapY + this.slideDir * (this.GAP_HALF + 14) * Math.sin(k * Math.PI)
    }
    if (distance > w.worldX + 260) {
      w.worldX = distance + this.RESPAWN_GAP
      w.resolved = false
      w.gapY = this.randomizeGapY()
    }
  },
  draw() {
    const w = this.wall
    const screenX = w.worldX - distance + playerX
    ctx.fillStyle = '#4b5563'
    ctx.fillRect(screenX - 14, 0, 28, w.gapY - this.GAP_HALF)
    ctx.fillRect(screenX - 14, w.gapY + this.GAP_HALF, 28, canvas.height - (w.gapY + this.GAP_HALF))
    drawLaneGuides()
  },
}

// -- scenario 3: Momentum Based Jump ------------------------------------------
// A ramp leads up to a gap in the road. Hold accelerate to clear the speed
// threshold before you reach the lip; enough speed auto-launches an arc over
// the gap onto a matching landing ramp, otherwise you drop short and reset to
// the start of the approach. The character rides the ground/ramp height
// directly (side-view terrain-follow), not a floating dodge position.
const jump = {
  label: 'Momentum Based Jump',
  THRESHOLD: 55,
  APPROACH_LEAD: 260,
  RESPAWN_GAP: 640,
  RAMP_LENGTH: 90,
  RAMP_HEIGHT: 42,
  GAP_WIDTH: 130,
  FALL_DURATION: 0.4,
  controlsPlayerY: true,
  gap: null,
  arcActive: false,
  fallT: 0,
  init() {
    this.gap = { worldX: 460, resolved: false }
    this.arcActive = false
    this.fallT = 0
  },
  // Height offset relative to the flat ground line: 0 on flat ground,
  // negative while rising up the ramp / airborne over the gap.
  groundOffsetAt(worldX) {
    const g = this.gap
    const rampStart = g.worldX - this.RAMP_LENGTH
    const gapEnd = g.worldX + this.GAP_WIDTH
    const landEnd = gapEnd + this.RAMP_LENGTH
    if (worldX < rampStart) return 0
    if (worldX < g.worldX) {
      const t = (worldX - rampStart) / this.RAMP_LENGTH
      return -this.RAMP_HEIGHT * t
    }
    if (worldX <= gapEnd) {
      const t = (worldX - g.worldX) / this.GAP_WIDTH
      return -this.RAMP_HEIGHT - Math.sin(t * Math.PI) * 34
    }
    if (worldX < landEnd) {
      const t = (worldX - gapEnd) / this.RAMP_LENGTH
      return -this.RAMP_HEIGHT * (1 - t)
    }
    return 0
  },
  isScrollFrozen() {
    return this.fallT > 0
  },
  update(dt) {
    const g = this.gap
    const groundY = laneCenter() + LANE_HALF

    if (!g.resolved && distance >= g.worldX) {
      g.resolved = true
      if (player.speed >= this.THRESHOLD) {
        this.arcActive = true
        clearedCleanly()
      } else {
        this.fallT = this.FALL_DURATION
      }
    }

    if (this.fallT > 0) {
      this.fallT = Math.max(0, this.fallT - dt)
      const k = 1 - this.fallT / this.FALL_DURATION
      player.y = groundY - this.RAMP_HEIGHT + k * (this.RAMP_HEIGHT + 40)
      if (this.fallT === 0) {
        resetToApproach(g.worldX - this.APPROACH_LEAD)
        this.arcActive = false
      }
    } else {
      player.y = groundY + this.groundOffsetAt(distance)
      if (this.arcActive && distance > g.worldX + this.GAP_WIDTH) this.arcActive = false
    }

    if (distance > g.worldX + this.GAP_WIDTH + this.RAMP_LENGTH + 200) {
      g.worldX = distance + this.RESPAWN_GAP
      g.resolved = false
    }
  },
  draw() {
    const g = this.gap
    const groundY = laneCenter() + LANE_HALF
    const rampStartX = g.worldX - this.RAMP_LENGTH - distance + playerX
    const peakX = g.worldX - distance + playerX
    const gapEndX = g.worldX + this.GAP_WIDTH - distance + playerX
    const landEndX = gapEndX + this.RAMP_LENGTH

    ctx.fillStyle = '#c9c2a8'
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(rampStartX, groundY)
    ctx.lineTo(peakX, groundY - this.RAMP_HEIGHT)
    ctx.lineTo(peakX, canvas.height)
    ctx.lineTo(0, canvas.height)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(gapEndX, groundY - this.RAMP_HEIGHT)
    ctx.lineTo(landEndX, groundY)
    ctx.lineTo(canvas.width, groundY)
    ctx.lineTo(canvas.width, canvas.height)
    ctx.lineTo(gapEndX, canvas.height)
    ctx.closePath()
    ctx.fill()

    ctx.strokeStyle = '#9c9370'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, groundY)
    ctx.lineTo(rampStartX, groundY)
    ctx.lineTo(peakX, groundY - this.RAMP_HEIGHT)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(gapEndX, groundY - this.RAMP_HEIGHT)
    ctx.lineTo(landEndX, groundY)
    ctx.lineTo(canvas.width, groundY)
    ctx.stroke()

    ctx.fillStyle = 'rgba(31,41,51,0.15)'
    ctx.fillRect(peakX, groundY - this.RAMP_HEIGHT, gapEndX - peakX, canvas.height - (groundY - this.RAMP_HEIGHT))
  },
}

// -- scenario 4: Slim Crossing -------------------------------------------------
// A stretch with a much narrower dodge band. You have to already be lined up
// the moment you reach it -- checked once at the crossing's start, the same
// point-of-contact pattern as the slit and the jump. Drift in wide and it
// fails immediately and resets to the start of the crossing; get in clean and
// you're through, no need to hold the line for the rest of the stretch.
const crossing = {
  label: 'Slim Crossing',
  NARROW_HALF: 26,
  LENGTH: 320,
  APPROACH_LEAD: 200,
  RESPAWN_GAP: 700,
  start: 0,
  resolved: false,
  init() {
    this.start = 420
    this.resolved = false
  },
  update() {
    if (!this.resolved && distance >= this.start) {
      this.resolved = true
      if (Math.abs(player.y - laneCenter()) > this.NARROW_HALF) {
        resetToApproach(this.start - this.APPROACH_LEAD)
        this.resolved = false
      } else {
        clearedCleanly()
      }
    }
    const end = this.start + this.LENGTH
    if (distance > end + 200) {
      this.start = distance + this.RESPAWN_GAP
      this.resolved = false
    }
  },
  draw() {
    const end = this.start + this.LENGTH
    const x0 = this.start - distance + playerX
    const x1 = end - distance + playerX
    ctx.fillStyle = 'rgba(124,58,237,0.06)'
    ctx.fillRect(x0, laneCenter() - this.NARROW_HALF, x1 - x0, this.NARROW_HALF * 2)
    ctx.strokeStyle = '#7c3aed'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x0, laneCenter() - this.NARROW_HALF)
    ctx.lineTo(x1, laneCenter() - this.NARROW_HALF)
    ctx.moveTo(x0, laneCenter() + this.NARROW_HALF)
    ctx.lineTo(x1, laneCenter() + this.NARROW_HALF)
    ctx.stroke()
    drawLaneGuides(0.25)
  },
}

// -- scenario 5: Crossing Herd -------------------------------------------------
// Small shapes crossing the lane vertically on their own clock. Brake and
// wait, or thread the gaps -- a judgment call, not a reflex test.
const herd = {
  label: 'Crossing Herd',
  worldX: 0,
  RESPAWN_GAP: 760,
  members: [],
  clock: 0,
  init() {
    this.worldX = 480
    this.clock = 0
    this.members = [0, 1, 2, 3].map((i) => ({ phase: i * 1.4, laneOffset: i * 22 - 33 }))
  },
  update(dt) {
    this.clock += dt
    const screenX = this.worldX - distance + playerX
    for (const m of this.members) {
      const y = laneCenter() + Math.sin(this.clock * 0.9 + m.phase) * (LANE_HALF - 10)
      const hit = circleCircleHit(playerX, player.y, PLAYER_RADIUS, screenX + m.laneOffset, y, 9)
      if (hit && !m.hit) {
        graze(6)
        m.hit = true
      } else if (!hit) {
        m.hit = false
      }
    }
    if (screenX < -80) {
      this.worldX = distance + this.RESPAWN_GAP
    }
  },
  draw() {
    drawLaneGuides()
    const screenX = this.worldX - distance + playerX
    ctx.fillStyle = '#0d9488'
    for (const m of this.members) {
      const y = laneCenter() + Math.sin(this.clock * 0.9 + m.phase) * (LANE_HALF - 10)
      ctx.beginPath()
      ctx.arc(screenX + m.laneOffset, y, 9, 0, Math.PI * 2)
      ctx.fill()
    }
  },
}

// -- scenario 6: Follower NPC --------------------------------------------------
// Enters ahead of the player like anything else scrolling in, then once it's
// been passed it settles behind and trails: the gap shrinks if you slow down
// or idle, and recovers once you're back to normal speed. Never actually
// catches up -- it's a tension beat, not a real threat. Its own position eases
// toward the player's smoothly rather than snapping to it every frame.
const follower = {
  label: 'Follower NPC',
  THRESHOLD: 45,
  MIN_GAP: 46,
  MAX_GAP: 220,
  SPAWN_BUFFER: 40, // extra world px past the right edge, so it pops in off-screen not right at the edge
  SMOOTHING: 3.2, // higher = catches up to the target position faster
  phase: 'approaching',
  worldX: 0,
  gap: 0,
  y: 0,
  init() {
    this.phase = 'approaching'
    // Spawn at the rightmost edge of the course, like anything else scrolling in.
    this.worldX = distance + (canvas.width - playerX) + this.SPAWN_BUFFER
    this.gap = this.MIN_GAP
    this.y = laneCenter()
  },
  targetScreenX() {
    return this.phase === 'approaching'
      ? this.worldX - distance + playerX
      : playerX - this.gap
  },
  update(dt) {
    if (this.phase === 'approaching') {
      if (distance >= this.worldX) this.phase = 'following'
    } else {
      const closingRate = 34
      const recoverRate = 40
      if (player.speed < this.THRESHOLD) {
        this.gap = Math.max(this.MIN_GAP, this.gap - closingRate * dt)
      } else {
        this.gap = Math.min(this.MAX_GAP, this.gap + recoverRate * dt)
      }
    }
    // Ease toward the player's height instead of snapping to it -- a smooth,
    // slightly lagged follow rather than a rigid vertical lock.
    const ease = 1 - Math.exp(-this.SMOOTHING * dt)
    this.y += (player.y - this.y) * ease
  },
  draw() {
    drawLaneGuides()
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.arc(this.targetScreenX(), this.y, 11, 0, Math.PI * 2)
    ctx.fill()
  },
}

const scenarios = { ruins, slit, jump, crossing, herd, follower }
let active = ruins

function drawLaneGuides(alpha = 0.5) {
  ctx.strokeStyle = `rgba(180,180,175,${alpha})`
  ctx.lineWidth = 1.5
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(0, laneCenter() - LANE_HALF)
  ctx.lineTo(canvas.width, laneCenter() - LANE_HALF)
  ctx.moveTo(0, laneCenter() + LANE_HALF)
  ctx.lineTo(canvas.width, laneCenter() + LANE_HALF)
  ctx.stroke()
  ctx.setLineDash([])
}

function loadScenario(name) {
  active = scenarios[name]
  distance = 0
  player.y = laneCenter()
  player.speed = NEUTRAL_SPEED
  hitFlash = resetFlash = successFlash = 0
  active.init()
  for (const btn of selector.children) {
    btn.classList.toggle('active', btn.dataset.scenario === name)
  }
}

selector.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-scenario]')
  if (btn) loadScenario(btn.dataset.scenario)
})

let last = performance.now()
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now

  if (keys.accel) player.speed = Math.min(MAX_SPEED, player.speed + ACCEL_RATE * dt)
  else if (keys.brake) player.speed = Math.max(MIN_SPEED, player.speed - BRAKE_RATE * dt)
  else if (player.speed > NEUTRAL_SPEED) player.speed = Math.max(NEUTRAL_SPEED, player.speed - NEUTRAL_EASE * dt)
  else if (player.speed < NEUTRAL_SPEED) player.speed = Math.min(NEUTRAL_SPEED, player.speed + NEUTRAL_EASE * dt)

  if (!active.controlsPlayerY) {
    const steerScale = active.steerMultiplier ? active.steerMultiplier() : 1
    if (keys.up) player.y -= STEER_RATE * steerScale * dt
    if (keys.down) player.y += STEER_RATE * steerScale * dt
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y))
  }

  if (!(active.isScrollFrozen && active.isScrollFrozen())) {
    distance += player.speed * dt * SCROLL_SCALE
  }

  active.update(dt)

  hitFlash = Math.max(0, hitFlash - dt)
  resetFlash = Math.max(0, resetFlash - dt)
  successFlash = Math.max(0, successFlash - dt)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  active.draw()

  ctx.fillStyle = hitFlash > 0 ? '#d97706' : '#1f2933'
  ctx.beginPath()
  ctx.arc(playerX, player.y, PLAYER_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  if (resetFlash > 0) {
    ctx.fillStyle = `rgba(220,38,38,${(resetFlash / 0.35) * 0.35})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  if (successFlash > 0) {
    ctx.fillStyle = `rgba(13,148,136,${(successFlash / 0.25) * 0.25})`
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  ctx.fillStyle = '#1f2933'
  ctx.font = '13px -apple-system, sans-serif'
  ctx.fillText(`speed  ${player.speed.toFixed(0)}`, 14, 20)
  ctx.fillText(active.label, 14, 38)

  requestAnimationFrame(tick)
}

resize()
playerX = canvas.width * 0.28
window.addEventListener('resize', () => { playerX = canvas.width * 0.28 })
loadScenario('ruins')
requestAnimationFrame(tick)
