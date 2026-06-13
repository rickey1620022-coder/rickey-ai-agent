/**
 * Rickey AI Agent — Rates Worker  (NALCO + LME + USD/INR)
 * ------------------------------------------------------------------
 * Free Cloudflare Worker. Fetches:
 *   - NALCO aluminium ingot rate (PDF, INR/MT)        — official source
 *   - LME aluminium 3-mo closing (HTML, USD/tonne)    — day-delayed (free tier)
 *   - USD-INR exchange (free open API)                — to show LME in INR/kg
 *
 * The app calls:  GET <workerURL>/rates  -> { ok, nalco, lme, fx, errors }
 * Health check:   GET <workerURL>/
 *
 * Cache is short (10 min) so price changes show quickly.
 */

const NALCO_BASE = 'https://nalcoindia.com/wp-content/uploads/2019/01/';
const LME_URL = 'https://www.lme.com/metals/non-ferrous/lme-aluminium';
const FX_URL = 'https://api.exchangerate.host/latest?base=USD&symbols=INR';
const FX_FALLBACK_URL = 'https://open.er-api.com/v6/latest/USD';
const CACHE_SECONDS = 600;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';

export default {
  async fetch(request) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    const url = new URL(request.url);
    if (url.pathname === '/' || url.pathname === '') {
      return new Response('Rickey rates worker OK. Call /rates for data.', {
        headers: { ...cors, 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const out = { ok: true, fetchedAt: new Date().toISOString(), nalco: null, lme: null, fx: null, errors: {} };

    // Run all three in parallel — any one failing doesn't block the others.
    const [n, l, f] = await Promise.allSettled([getNalco(), getLme(), getFx()]);
    if (n.status === 'fulfilled') out.nalco = n.value; else out.errors.nalco = String(n.reason && n.reason.message || n.reason);
    if (l.status === 'fulfilled') out.lme   = l.value; else out.errors.lme   = String(l.reason && l.reason.message || l.reason);
    if (f.status === 'fulfilled') out.fx    = f.value; else out.errors.fx    = String(f.reason && f.reason.message || f.reason);

    // Derived INR/kg for LME using current FX (handy for the app)
    if (out.lme && out.fx && out.fx.usdInr) {
      out.lme.perKgInr = Math.round((out.lme.perTonneUsd * out.fx.usdInr / 1000) * 100) / 100;
      out.lme.perMtInr = Math.round(out.lme.perTonneUsd * out.fx.usdInr);
    }

    return new Response(JSON.stringify(out), {
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
    });
  },
};

async function fetchTimeout(url, opts = {}, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// ============================ NALCO ============================
// Walk back from today (in IST, since NALCO publishes by Indian date) up to 30 days.
async function getNalco() {
  const istNow = new Date(Date.now() + 5.5 * 3600 * 1000); // shift to IST
  for (let i = 0; i < 30; i++) {
    const d = new Date(istNow.getTime() - i * 86400 * 1000);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    for (const name of [`Ingot-${dd}-${mm}-${yyyy}.pdf`, `INGOT-${dd}-${mm}-${yyyy}.pdf`]) {
      try {
        const res = await fetchTimeout(NALCO_BASE + name, {
          headers: { 'User-Agent': UA, 'Accept': 'application/pdf,*/*' },
          cf: { cacheTtl: 600 },
        }, 8000);
        if (!res.ok) continue;
        const buf = new Uint8Array(await res.arrayBuffer());
        const text = await pdfToText(buf);
        const price = parseNalco(text);
        if (price) {
          return { perMT: price, perKg: Math.round((price / 1000) * 100) / 100, date: `${dd}-${mm}-${yyyy}`, grade: 'IE07' };
        }
      } catch (e) { /* try next */ }
    }
  }
  throw new Error('No NALCO circular found in last 30 days');
}

async function pdfToText(bytes) {
  let text = bytesToLatin1(bytes);
  const streamTag = strToBytes('stream');
  const endTag = strToBytes('endstream');
  const chunks = [];
  let idx = 0;
  while (true) {
    const s = indexOfBytes(bytes, streamTag, idx);
    if (s < 0) break;
    let dataStart = s + streamTag.length;
    if (bytes[dataStart] === 0x0d && bytes[dataStart + 1] === 0x0a) dataStart += 2;
    else if (bytes[dataStart] === 0x0a || bytes[dataStart] === 0x0d) dataStart += 1;
    const e = indexOfBytes(bytes, endTag, dataStart);
    if (e < 0) break;
    let dataEnd = e;
    if (bytes[dataEnd - 1] === 0x0a) dataEnd--;
    if (bytes[dataEnd - 1] === 0x0d) dataEnd--;
    chunks.push(bytes.slice(dataStart, dataEnd));
    idx = e + endTag.length;
    if (chunks.length > 60) break;
  }
  for (const c of chunks) {
    const inflated = await tryInflate(c);
    if (inflated) text += '\n' + bytesToLatin1(inflated);
  }
  text += '\n' + extractParenText(text);
  return text;
}

async function tryInflate(bytes) {
  for (const fmt of ['deflate', 'deflate-raw']) {
    try {
      const ds = new DecompressionStream(fmt);
      const stream = new Response(bytes).body.pipeThrough(ds);
      const out = new Uint8Array(await new Response(stream).arrayBuffer());
      if (out && out.length) return out;
    } catch (e) { /* try next */ }
  }
  return null;
}

function extractParenText(s) {
  const out = [];
  const re = /\(((?:\\.|[^()\\])*)\)/g;
  let m, n = 0;
  while ((m = re.exec(s)) && n < 5000) { out.push(m[1]); n++; }
  return out.join(' ').replace(/\\(\d{3}|.)/g, ' ');
}

function parseNalco(text) {
  if (!text) return null;
  const t = text.replace(/\s+/g, ' ');
  let m = t.match(/IE07\D{0,8}([0-9]{5,7})/);
  if (!m) m = t.match(/IE10\D{0,8}([0-9]{5,7})/);
  if (!m) m = t.match(/IC20\D{0,8}([0-9]{5,7})/);
  if (!m) {
    const all = (t.match(/\b(4[0-2][0-9]{4})\b/g) || []).map(Number).filter(v => v >= 350000 && v <= 520000);
    if (all.length) return all[0];
    return null;
  }
  const v = parseInt(m[1], 10);
  return (v >= 50000 && v <= 9999999) ? v : null;
}

// ============================ LME ============================
// LME page shows the 3-month closing price (day-delayed) in the heading area:
//   # LME Aluminium  3535.00  0.94%
async function getLme() {
  const res = await fetchTimeout(LME_URL, {
    headers: { 'User-Agent': UA, 'Accept': 'text/html' },
    cf: { cacheTtl: 600 },
  }, 9000);
  if (!res.ok) throw new Error('LME HTTP ' + res.status);
  const html = await res.text();

  // Strip tags, normalise spaces; the price appears as "LME Aluminium  <num>  <num>%"
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ');

  // Look for "LME Aluminium <price> <delta>%"
  let m = text.match(/LME\s+Aluminium\s+([0-9]{3,5}(?:\.[0-9]+)?)\s+(-?[0-9]+(?:\.[0-9]+)?)\s*%/i);
  // Fallback: first reasonable "NNNN.NN xx%" pattern after the words "Aluminium"
  if (!m) {
    const aIdx = text.search(/LME\s+Aluminium/i);
    if (aIdx >= 0) {
      const slice = text.slice(aIdx, aIdx + 400);
      m = slice.match(/([0-9]{3,5}\.[0-9]{2})\s+(-?[0-9]+(?:\.[0-9]+)?)\s*%/);
    }
  }
  if (!m) throw new Error('LME price not found in page');

  const perTonneUsd = parseFloat(m[1]);
  const changePct = parseFloat(m[2]);
  if (!perTonneUsd || perTonneUsd < 500 || perTonneUsd > 20000) {
    throw new Error('LME price out of range: ' + perTonneUsd);
  }

  return {
    perTonneUsd,
    changePct,
    label: '3-month Closing (day-delayed)',
    source: 'LME',
  };
}

// ============================ USD-INR ============================
async function getFx() {
  // Primary: exchangerate.host (no key, JSON)
  try {
    const r = await fetchTimeout(FX_URL, { cf: { cacheTtl: 600 } }, 6000);
    if (r.ok) {
      const j = await r.json();
      const v = j && j.rates && j.rates.INR;
      if (v && v > 50 && v < 200) return { usdInr: Math.round(v * 100) / 100, source: 'exchangerate.host' };
    }
  } catch (e) { /* try fallback */ }
  // Fallback: open.er-api.com
  try {
    const r = await fetchTimeout(FX_FALLBACK_URL, { cf: { cacheTtl: 600 } }, 6000);
    if (r.ok) {
      const j = await r.json();
      const v = j && j.rates && j.rates.INR;
      if (v && v > 50 && v < 200) return { usdInr: Math.round(v * 100) / 100, source: 'open.er-api.com' };
    }
  } catch (e) {}
  throw new Error('FX unavailable');
}

// ============================ helpers ============================
function bytesToLatin1(bytes) {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return out;
}
function strToBytes(s) {
  const a = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}
function indexOfBytes(hay, needle, from) {
  outer: for (let i = from; i <= hay.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}
