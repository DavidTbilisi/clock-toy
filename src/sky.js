// 24-hour sky: gradient + sun arc + stars. Pure UI, no state coupling.
// Sun walks the full 24-hour cycle (east horizon at midnight → peak at noon
// → west horizon at the next midnight) so it's always visible.

const NS = 'http://www.w3.org/2000/svg';

const SKY_STOPS = [
  { h: 0,  top: [10, 20, 48],   bot: [26, 37, 71]   },
  { h: 5,  top: [45, 32, 80],   bot: [90, 58, 111]  },
  { h: 6,  top: [255, 140, 66], bot: [253, 180, 98] },
  { h: 8,  top: [135, 206, 235], bot: [184, 224, 245] },
  { h: 12, top: [79, 195, 247], bot: [129, 212, 250] },
  { h: 15, top: [95, 184, 232], bot: [163, 213, 240] },
  { h: 17, top: [255, 179, 71], bot: [255, 140, 66] },
  { h: 18, top: [255, 107, 53], bot: [196, 69, 105] },
  { h: 19, top: [123, 45, 142], bot: [61, 43, 86]   },
  { h: 21, top: [26, 37, 71],   bot: [10, 20, 48]   },
  { h: 24, top: [10, 20, 48],   bot: [26, 37, 71]   },
];

function lerp(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

export function skyForTime(h24, m) {
  const t = h24 + m / 60;
  let i = 0;
  while (i < SKY_STOPS.length - 1 && SKY_STOPS[i + 1].h <= t) i++;
  const a = SKY_STOPS[i];
  const b = SKY_STOPS[Math.min(i + 1, SKY_STOPS.length - 1)];
  const f = b.h === a.h ? 0 : (t - a.h) / (b.h - a.h);
  const top = lerp(a.top, b.top, f);
  const bot = lerp(a.bot, b.bot, f);
  const sunAngle = (t / 24) * 180;

  // dayFactor: 0 at midnight, peaks at 1 at solar noon, 0 again at next midnight.
  // Drives sun size + glow so the sun grows huge and shines bright at midday.
  const dayFactor = Math.sin((t / 24) * Math.PI);
  const sunScale = 0.65 + 0.85 * dayFactor;
  const sunBrightness = 0.7 + 0.8 * dayFactor;
  const sunGlowPx = 4 + 38 * dayFactor;
  const sunGlowAlpha = 0.15 + 0.6 * dayFactor;

  let starsOpacity = 0;
  if (h24 < 6 || h24 >= 18) {
    const d = Math.min(t, 24 - t);
    starsOpacity = Math.max(0, Math.min(1, 1 - d / 6));
  }
  return {
    skyTop: `rgb(${top.join(',')})`,
    skyBot: `rgb(${bot.join(',')})`,
    sunAngle,
    sunScale,
    sunBrightness,
    sunGlowPx,
    sunGlowAlpha,
    starsOpacity,
  };
}

// Half-ellipse over the top sky strip: wide horizontal, narrow vertical
// so noon peaks high and dawn/dusk land at the sides.
function arcCoords(angle) {
  const vw = window.innerWidth;
  const cx = vw / 2;
  const cy = 130;
  const a = Math.max(160, vw / 2 - 40);
  const b = 110;
  const r = (180 - angle) * Math.PI / 180;
  return { x: cx + a * Math.cos(r), y: cy - b * Math.sin(r) };
}

export class Sky {
  constructor({ body, sun, stars }) {
    this.body = body;
    this.sun = sun;
    this.stars = stars;
  }

  build() {
    this.stars.innerHTML = '';
    let s = 1234;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let i = 0; i < 40; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', (rnd() * 1000).toFixed(1));
      c.setAttribute('cy', (rnd() * 300).toFixed(1));
      c.setAttribute('r',  (1 + rnd() * 1.6).toFixed(2));
      c.setAttribute('fill', '#ffffff');
      if (i % 3 === 0) {
        c.style.animation = `twinkle ${(2 + rnd() * 2.5).toFixed(2)}s infinite alternate`;
      }
      this.stars.appendChild(c);
    }
    this.apply(12, 0);
  }

  apply(h24, m) {
    const s = skyForTime(h24, m);
    this.body.style.background = `linear-gradient(180deg, ${s.skyTop}, ${s.skyBot})`;
    const p = arcCoords(s.sunAngle);
    this.sun.style.left = p.x.toFixed(1) + 'px';
    this.sun.style.top  = p.y.toFixed(1) + 'px';
    // Preserve the centering translate that lives in the base CSS.
    this.sun.style.transform = `translate(-50%,-50%) scale(${s.sunScale.toFixed(3)})`;
    this.sun.style.filter =
      `brightness(${s.sunBrightness.toFixed(3)}) ` +
      `drop-shadow(0 0 ${s.sunGlowPx.toFixed(1)}px rgba(255,213,79,${s.sunGlowAlpha.toFixed(3)}))`;
    this.sun.classList.remove('hidden');
    this.stars.style.opacity = s.starsOpacity;
  }
}
