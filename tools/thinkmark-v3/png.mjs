// minimal PNG reader (8-bit, colour types 0/2/3/4/6, non-interlaced) -> { w, h, rgba }
import zlib from 'node:zlib'
import fs from 'node:fs'
export function readPng(file) {
  const b = fs.readFileSync(file)
  let p = 8
  let w = 0
  let h = 0
  let ct = 0
  let pal = null
  let trns = null
  const idat = []
  while (p < b.length) {
    const len = b.readUInt32BE(p)
    const type = b.toString('ascii', p + 4, p + 8)
    const d = b.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12] !== 0) throw new Error('unsupported png ' + file) }
    else if (type === 'PLTE') pal = d
    else if (type === 'tRNS') trns = d
    else if (type === 'IDAT') idat.push(d)
    p += 12 + len
  }
  const raw = zlib.inflateSync(Buffer.concat(idat))
  const bpp = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct]
  const stride = w * bpp
  const out = Buffer.alloc(h * stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)]
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[y * stride + x - bpp] : 0
      const up = y ? out[(y - 1) * stride + x] : 0
      const c = x >= bpp && y ? out[(y - 1) * stride + x - bpp] : 0
      let v = src[x]
      if (f === 1) v += a
      else if (f === 2) v += up
      else if (f === 3) v += (a + up) >> 1
      else if (f === 4) { const pp = a + up - c; const pa = Math.abs(pp - a); const pb = Math.abs(pp - up); const pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      out[y * stride + x] = v & 255
    }
  }
  const rgba = Buffer.alloc(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    let r; let g; let bl; let a = 255
    if (ct === 6) { r = out[i * 4]; g = out[i * 4 + 1]; bl = out[i * 4 + 2]; a = out[i * 4 + 3] }
    else if (ct === 2) { r = out[i * 3]; g = out[i * 3 + 1]; bl = out[i * 3 + 2] }
    else if (ct === 3) { const k = out[i]; r = pal[k * 3]; g = pal[k * 3 + 1]; bl = pal[k * 3 + 2]; a = trns && k < trns.length ? trns[k] : 255 }
    else if (ct === 0) { r = g = bl = out[i] }
    else { r = g = bl = out[i * 2]; a = out[i * 2 + 1] }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = bl; rgba[i * 4 + 3] = a
  }
  return { w, h, rgba }
}
