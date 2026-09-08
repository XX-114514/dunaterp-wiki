// A minimal Canvas2D rasteriser, just large enough to run the DunaTerp pixel
// renderer outside a browser so the art can be inspected as a PNG.
import zlib from "node:zlib";

function parseColor(value) {
  if (typeof value !== "string") return null;
  if (value[0] === "#") {
    const hex = value.slice(1);
    if (hex.length === 6) {
      return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
    }
  }
  const m = value.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((n) => parseFloat(n));
    return [parts[0] | 0, parts[1] | 0, parts[2] | 0, Math.round((parts[3] ?? 1) * 255)];
  }
  return [255, 0, 255, 255];
}

class Gradient {
  constructor(x0, y0, r0, x1, y1, r1) {
    Object.assign(this, { x0, y0, r0, x1, y1, r1 });
    this.stops = [];
  }
  addColorStop(offset, color) {
    this.stops.push([offset, parseColor(color)]);
    this.stops.sort((a, b) => a[0] - b[0]);
  }
  sample(x, y) {
    const d = Math.hypot(x - this.x1, y - this.y1);
    let t = (d - this.r0) / Math.max(1e-6, this.r1 - this.r0);
    t = Math.max(0, Math.min(1, t));
    if (!this.stops.length) return [0, 0, 0, 0];
    let lo = this.stops[0];
    let hi = this.stops[this.stops.length - 1];
    for (let i = 0; i < this.stops.length - 1; i += 1) {
      if (t >= this.stops[i][0] && t <= this.stops[i + 1][0]) {
        lo = this.stops[i];
        hi = this.stops[i + 1];
        break;
      }
    }
    const span = Math.max(1e-6, hi[0] - lo[0]);
    const k = (t - lo[0]) / span;
    return lo[1].map((v, i) => Math.round(v + (hi[1][i] - v) * k));
  }
}

class Ctx2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = "#000000";
    this.globalAlpha = 1;
    this.globalCompositeOperation = "source-over";
    this.imageSmoothingEnabled = false;
    this.t = [1, 0, 0, 1, 0, 0];
    this.stack = [];
  }
  save() { this.stack.push([this.t.slice(), this.fillStyle, this.globalAlpha, this.globalCompositeOperation]); }
  restore() {
    const s = this.stack.pop();
    if (s) [this.t, this.fillStyle, this.globalAlpha, this.globalCompositeOperation] = s;
  }
  translate(x, y) { this.t[4] += x * this.t[0]; this.t[5] += y * this.t[3]; }
  scale(x, y) { this.t[0] *= x; this.t[3] *= y; }
  setTransform(a, b, c, d, e, f) { this.t = [a, b, c, d, e, f]; }
  rotate(r) {
    const [a, b, c, d, e, f] = this.t;
    const cs = Math.cos(r); const sn = Math.sin(r);
    this.t = [a * cs + c * sn, b * cs + d * sn, a * -sn + c * cs, b * -sn + d * cs, e, f];
  }
  createRadialGradient(x0, y0, r0, x1, y1, r1) { return new Gradient(x0, y0, r0, x1, y1, r1); }
  createImageData(w, h) { return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }; }

  blend(x, y, rgba, alpha) {
    const c = this.canvas;
    if (x < 0 || y < 0 || x >= c._w || y >= c._h) return;
    const a = (rgba[3] / 255) * alpha;
    if (a <= 0) return;
    const o = (y * c._w + x) * 4;
    const d = c.data;
    d[o] = Math.round(d[o] * (1 - a) + rgba[0] * a);
    d[o + 1] = Math.round(d[o + 1] * (1 - a) + rgba[1] * a);
    d[o + 2] = Math.round(d[o + 2] * (1 - a) + rgba[2] * a);
    d[o + 3] = Math.round(d[o + 3] * (1 - a) + 255 * a);
  }

  fillRect(x, y, w, h) {
    const [a, , , d, e, f] = this.t;
    let x0 = Math.round(x * a + e);
    let y0 = Math.round(y * d + f);
    let x1 = Math.round((x + w) * a + e);
    let y1 = Math.round((y + h) * d + f);
    if (x1 < x0) [x0, x1] = [x1, x0];
    if (y1 < y0) [y0, y1] = [y1, y0];
    const grad = this.fillStyle instanceof Gradient ? this.fillStyle : null;
    const flat = grad ? null : parseColor(this.fillStyle);
    // Fast path: opaque solid fill straight into the buffer.
    if (flat && flat[3] === 255 && this.globalAlpha === 1) {
      const c = this.canvas;
      const lx = Math.max(0, x0); const rx = Math.min(c._w, x1);
      const ty = Math.max(0, y0); const by = Math.min(c._h, y1);
      for (let py = ty; py < by; py += 1) {
        let o = (py * c._w + lx) * 4;
        for (let pxx = lx; pxx < rx; pxx += 1) {
          c.data[o] = flat[0]; c.data[o + 1] = flat[1]; c.data[o + 2] = flat[2]; c.data[o + 3] = 255;
          o += 4;
        }
      }
      return;
    }
    for (let py = y0; py < y1; py += 1) {
      for (let pxx = x0; pxx < x1; pxx += 1) {
        this.blend(pxx, py, grad ? grad.sample(pxx, py) : flat, this.globalAlpha);
      }
    }
  }

  putImageData(img, dx, dy) {
    const c = this.canvas;
    for (let y = 0; y < img.height; y += 1) {
      for (let x = 0; x < img.width; x += 1) {
        const o = (y * img.width + x) * 4;
        if (img.data[o + 3] === 0) continue;
        const px = dx + x;
        const py = dy + y;
        if (px < 0 || py < 0 || px >= c._w || py >= c._h) continue;
        const t = (py * c._w + px) * 4;
        c.data[t] = img.data[o];
        c.data[t + 1] = img.data[o + 1];
        c.data[t + 2] = img.data[o + 2];
        c.data[t + 3] = img.data[o + 3];
      }
    }
  }

  drawImage(src, ...args) {
    let sx = 0; let sy = 0; let sw = src._w; let sh = src._h;
    let dx; let dy; let dw; let dh;
    if (args.length === 2) { [dx, dy] = args; dw = sw; dh = sh; }
    else if (args.length === 4) { [dx, dy, dw, dh] = args; }
    else { [sx, sy, sw, sh, dx, dy, dw, dh] = args; }
    const [ta, tb, tc, td, te, tf] = this.t;
    if (tb !== 0 || tc !== 0) {
      // Rotated / skewed: walk the destination bounding box and inverse map.
      const pts = [[dx, dy], [dx + dw, dy], [dx, dy + dh], [dx + dw, dy + dh]]
        .map(([x, y]) => [ta * x + tc * y + te, tb * x + td * y + tf]);
      const minX = Math.floor(Math.min(...pts.map((q) => q[0])));
      const maxX = Math.ceil(Math.max(...pts.map((q) => q[0])));
      const minY = Math.floor(Math.min(...pts.map((q) => q[1])));
      const maxY = Math.ceil(Math.max(...pts.map((q) => q[1])));
      const det = ta * td - tb * tc;
      if (!det) return;
      const ia = td / det; const ib = -tb / det; const ic = -tc / det; const id = ta / det;
      for (let py = minY; py < maxY; py += 1) {
        for (let pxx = minX; pxx < maxX; pxx += 1) {
          const rx = pxx + 0.5 - te; const ry = py + 0.5 - tf;
          const ux = ia * rx + ic * ry; const uy = ib * rx + id * ry;
          if (ux < dx || uy < dy || ux >= dx + dw || uy >= dy + dh) continue;
          const ssx = sx + Math.floor(((ux - dx) / dw) * sw);
          const ssy = sy + Math.floor(((uy - dy) / dh) * sh);
          if (ssx < 0 || ssy < 0 || ssx >= src._w || ssy >= src._h) continue;
          const o = (ssy * src._w + ssx) * 4;
          if (src.data[o + 3] === 0) continue;
          this.blend(pxx, py, [src.data[o], src.data[o + 1], src.data[o + 2], src.data[o + 3]], this.globalAlpha);
        }
      }
      return;
    }
    const a = ta; const d = td; const e = te; const f = tf;
    let X0 = Math.round(dx * a + e);
    let Y0 = Math.round(dy * d + f);
    let X1 = Math.round((dx + dw) * a + e);
    let Y1 = Math.round((dy + dh) * d + f);
    const flipX = X1 < X0;
    const flipY = Y1 < Y0;
    if (flipX) [X0, X1] = [X1, X0];
    if (flipY) [Y0, Y1] = [Y1, Y0];
    const outW = X1 - X0;
    const outH = Y1 - Y0;
    for (let py = 0; py < outH; py += 1) {
      for (let pxx = 0; pxx < outW; pxx += 1) {
        const u = flipX ? outW - 1 - pxx : pxx;
        const v = flipY ? outH - 1 - py : py;
        const ssx = sx + Math.floor((u / outW) * sw);
        const ssy = sy + Math.floor((v / outH) * sh);
        if (ssx < 0 || ssy < 0 || ssx >= src._w || ssy >= src._h) continue;
        const o = (ssy * src._w + ssx) * 4;
        if (src.data[o + 3] === 0) continue;
        this.blend(X0 + pxx, Y0 + py, [src.data[o], src.data[o + 1], src.data[o + 2], src.data[o + 3]], this.globalAlpha);
      }
    }
  }
}

class FakeCanvas {
  constructor() { this._w = 0; this._h = 0; this.data = new Uint8ClampedArray(0); this.style = {}; this.ctx = null; }
  get width() { return this._w; }
  set width(v) { this._w = v | 0; this.alloc(); }
  get height() { return this._h; }
  set height(v) { this._h = v | 0; this.alloc(); }
  alloc() { this.data = new Uint8ClampedArray(Math.max(0, this._w * this._h * 4)); }
  getContext() { if (!this.ctx) this.ctx = new Ctx2D(this); return this.ctx; }
  addEventListener() {}
  removeEventListener() {}
}

export function installShim() {
  globalThis.document = { createElement: (tag) => (tag === "canvas" ? new FakeCanvas() : { style: {} }), hidden: false };
  globalThis.window = { devicePixelRatio: 1, innerWidth: 1280, innerHeight: 720 };
  globalThis.HTMLCanvasElement = FakeCanvas;
}

export function writePng(canvas) {
  const { _w: w, _h: h, data } = canvas;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y += 1) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(data.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const chunks = [];
  const chunk = (type, body) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(body.length);
    const t = Buffer.from(type, "ascii");
    const crcBuf = Buffer.concat([t, body]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcBuf) >>> 0);
    chunks.push(len, t, body, crc);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  chunks.push(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  chunk("IHDR", ihdr);
  chunk("IDAT", zlib.deflateSync(raw, { level: 6 }));
  chunk("IEND", Buffer.alloc(0));
  return { buffer: Buffer.concat(chunks) };
}

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return c ^ -1;
}
