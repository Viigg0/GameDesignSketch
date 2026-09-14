// hello-juice
// The only thing this prototype is about: does a click feel like it hit something?
// No art, no sound, no game loop beyond this. Copy this folder to start a new sketch.

const canvas = document.getElementById('stage')
const ctx = canvas.getContext('2d')

function resize() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
resize()
window.addEventListener('resize', resize)

let shake = 0
const particles = []

function spawnBurst(x, y) {
  const count = 24
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2
    const speed = 2 + Math.random() * 4
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
    })
  }
  shake = 14
}

canvas.addEventListener('pointerdown', (e) => {
  spawnBurst(e.clientX, e.clientY)
})

function tick() {
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

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.vy += 0.15 // a little gravity, purely for feel
    p.life -= 0.02
    if (p.life <= 0) {
      particles.splice(i, 1)
      continue
    }
    ctx.globalAlpha = p.life
    ctx.fillStyle = '#e0b84b'
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
  ctx.restore()

  requestAnimationFrame(tick)
}
tick()
