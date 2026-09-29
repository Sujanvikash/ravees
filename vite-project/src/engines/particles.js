/**
 * RAAVE'S EVERGREEN - 4K Ultra-HD Stardust & Particle Physics Engine
 * High-Density Subpixel Snowfall, Diamond Shimmer, and Velocity-Responsive Golden Bokeh
 */

export class ParticleEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.sparkles = [];
    this.bokehList = [];
    this.maxParticles = 140;
    this.maxSparkles = 60;
    this.maxBokeh = 28;
    this.mouse = { x: -1000, y: -1000, radius: 160 };
    this.scrollVelocity = 0;
    this.lastScrollY = window.scrollY;
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this.rafId = null;
    this.running = false;

    this.onResize = () => this.resize();
    this.onMouseMove = (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    };
    this.onMouseLeave = () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    };
    this.loop = () => this.render();

    this.init();
  }

  init() {
    this.resize();
    this.createParticles();
    this.bindEvents();
    this.start();
  }

  resize() {
    // Soft glowing dots gain nothing from a 2x backing store; 1.5x keeps them crisp
    // while clearing/filling far fewer pixels every frame.
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    // setTransform (not scale) so repeated resizes don't compound the scale
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseleave', this.onMouseLeave);
  }

  createParticles() {
    this.particles = [];
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 2.5 + 0.6,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: Math.random() * 0.9 + 0.3,
        alpha: Math.random() * 0.75 + 0.25,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
        isGold: Math.random() > 0.4
      });
    }

    this.sparkles = [];
    for (let i = 0; i < this.maxSparkles; i++) {
      this.sparkles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() * 3.5 + 1.2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.04,
        alpha: Math.random() * 0.85 + 0.15,
        speedY: Math.random() * 0.6 + 0.2
      });
    }

    // 4K Floating Gold Bokeh Orbs
    this.bokehList = [];
    for (let i = 0; i < this.maxBokeh; i++) {
      this.bokehList.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: Math.random() * 22 + 10,
        speedY: Math.random() * 0.3 + 0.1,
        speedX: (Math.random() - 0.5) * 0.2,
        alpha: Math.random() * 0.18 + 0.04,
        pulsePhase: Math.random() * Math.PI * 2
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', this.onResize, { passive: true });
    window.addEventListener('mousemove', this.onMouseMove, { passive: true });
    window.addEventListener('mouseleave', this.onMouseLeave);
  }

  triggerBurst(x, y, count = 16) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x: x || this.width / 2,
        y: y || this.height / 2,
        size: Math.random() * 3.5 + 1.5,
        speedX: Math.cos(angle) * speed,
        speedY: Math.sin(angle) * speed,
        alpha: 1,
        pulseSpeed: 0.05,
        pulsePhase: 0,
        isGold: true,
        decay: 0.02
      });
    }
  }

  updateVelocity(vel) {
    this.scrollVelocity = vel;
  }

  render() {
    if (!this.running) return;
    this.ctx.clearRect(0, 0, this.width, this.height);

    const boostY = Math.min(Math.abs(this.scrollVelocity) * 0.45, 5);

    // 1. Draw Golden 4K Bokeh Orbs in Background
    for (let i = 0; i < this.bokehList.length; i++) {
      const b = this.bokehList[i];
      b.y += b.speedY + boostY * 0.2;
      b.x += b.speedX;
      b.pulsePhase += 0.015;

      if (b.y > this.height + b.radius) {
        b.y = -b.radius;
        b.x = Math.random() * this.width;
      }

      const curAlpha = b.alpha * (0.8 + Math.sin(b.pulsePhase) * 0.2);
      const grad = this.ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
      grad.addColorStop(0, `rgba(229, 199, 139, ${curAlpha * 1.5})`);
      grad.addColorStop(0.6, `rgba(229, 199, 139, ${curAlpha * 0.5})`);
      grad.addColorStop(1, 'rgba(229, 199, 139, 0)');

      this.ctx.fillStyle = grad;
      this.ctx.beginPath();
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // 2. Draw 4K Micro-Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.y += p.speedY + boostY;
      p.x += p.speedX;
      p.pulsePhase += p.pulseSpeed;

      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.mouse.radius) {
        const force = (this.mouse.radius - dist) / this.mouse.radius;
        p.x += (dx / dist) * force * 2.5;
        p.y += (dy / dist) * force * 2.5;
      }

      if (p.decay) {
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        if (p.y > this.height) {
          p.y = -10;
          p.x = Math.random() * this.width;
        }
        if (p.x > this.width) p.x = 0;
        if (p.x < 0) p.x = this.width;
      }

      const currentAlpha = Math.max(0, p.alpha * (0.75 + Math.sin(p.pulsePhase) * 0.25));
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

      if (p.isGold) {
        this.ctx.fillStyle = `rgba(255, 230, 170, ${currentAlpha})`;
      } else {
        this.ctx.fillStyle = `rgba(240, 250, 255, ${currentAlpha * 0.95})`;
      }
      this.ctx.fill();
    }

    // 3. Draw 4K Diamond Starburst Crosses
    for (let i = 0; i < this.sparkles.length; i++) {
      const s = this.sparkles[i];
      s.y += s.speedY + boostY * 0.5;
      s.rotation += s.rotSpeed;

      if (s.y > this.height) {
        s.y = -10;
        s.x = Math.random() * this.width;
      }

      this.ctx.save();
      this.ctx.translate(s.x, s.y);
      this.ctx.rotate(s.rotation);
      this.ctx.strokeStyle = `rgba(255, 240, 190, ${s.alpha})`;
      this.ctx.lineWidth = 1.2;
      this.ctx.beginPath();
      this.ctx.moveTo(-s.size, 0);
      this.ctx.lineTo(s.size, 0);
      this.ctx.moveTo(0, -s.size);
      this.ctx.lineTo(0, s.size);
      this.ctx.stroke();

      // Inner Diamond Core
      this.ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      this.ctx.fillRect(-0.8, -0.8, 1.6, 1.6);
      this.ctx.restore();
    }

    this.rafId = requestAnimationFrame(this.loop);
  }
}
