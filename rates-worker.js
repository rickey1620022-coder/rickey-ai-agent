/**
 * Rickey AI Agent — Rates Worker  (NALCO + Aluminium Futures + USD/INR)
 * ------------------------------------------------------------------
 * Sources:
 *   - NALCO aluminium ingot PDF (official Indian source, INR/MT)
 *   - Yahoo Finance ALI=F (COMEX aluminium futures, USD/tonne, free, no key)
 *     This is the internationally quoted aluminium price, closely tracks LME.
 *   - USD-INR from open.er-api.com (free, no key)
 *
 * The app calls:  GET <workerURL>/rates  -> { ok, nalco, lme, fx, errors }
 * Health check:   GET <workerURL>/
 */

const NALCO_BASE = 'https://nalcoindia.com/wp-content/uploads/2019/01/';
const YAHOO_URL  = 'https://query1.finance.yahoo.com/v8/finance/chart/ALI%3DF?interval=1d&range=5d';
const FX_URL     = 'https://open.er-api.com/v6/latest/USD';
const FX_URL2    = 'https://api.exchangerate.host/latest?base=USD&symbols=INR';
const CACHE_SECONDS = 300; // 5 min
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

    // Run all three in parallel
    const [n, l, f] = await Promise.allSettled([getNalco(), getLme(), getFx()]);
    if (n.status === 'fulfilled') out.nalco = n.value;
    else out.errors.nalco = String(n.reason && n.reason.message || n.reason);
    if (l.status === 'fulfilled') out.lme = l.value;
    else out.errors.lme = String(l.reason && l.reason.message || l.reason);
    if (f.status === 'fulfilled') out.fx = f.value;
    else out.errors.fx = String(f.reason && f.reason.message || f.reason);

    // Compute LME in INR/kg using live FX (or fallback ~86)
    if (out.lme && out.lme.perTonneUsd) {
      const fxRate = (out.fx && out.fx.usdInr) || 86.5;
      out.lme.perKgInr  = Math.round(out.lme.perTonneUsd * fxRate / 1000 * 100) / 100;
      out.lme.perMtInr  = Math.round(out.lme.perTonneUsd * fxRate);
      out.lme.fxUsed    = fxRate;
    }

    return new Response(JSON.stringify(out), {
      headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${CACHE_SECONDS}` },
    });
  },
};

async function fetchTimeout(url, opts = {}, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

// ============================ NALCO ============================
// Strategy: first do a fast HEAD scan to find which dated file actually exists
// on NALCO's server (HEAD is ~100ms, no body download). Then GET only that file.
// This avoids the "download stale PDF 8 times" timeout problem.
async function getNalco() {
  const istNow = new Date(Date.now() + 5.5 * 3600 * 1000);

  // Step 1: find the actual existing file via HEAD (no body, very fast)
  let foundName = null, foundDate = null;
  for (let i = 0; i < 30 && !foundName; i++) {
    const d = new Date(istNow.getTime() - i * 86400 * 1000);
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = d.getUTCFullYear();
    for (const name of [`Ingot-${dd}-${mm}-${yyyy}.pdf`, `INGOT-${dd}-${mm}-${yyyy}.pdf`]) {
      try {
        const res = await fetchTimeout(NALCO_BASE + name, {
          method: 'HEAD',
          headers: { 'User-Agent': UA },
          cf: { cacheTtl: 60 },
        }, 3000);
        if (res.ok) {
          // Confirm it's actually a PDF (not a redirect to an HTML error page)
          const ct = res.headers && res.headers.get('content-type');
          if (ct && ct.includes('html')) continue; // HTML = redirect/error page
          foundName = name;
          foundDate = `${dd}.${mm}.${yyyy}`;
          break;
        }
      } catch (e) {}
    }
  }

  if (!foundName) throw new Error('No NALCO circular found (HEAD scan, 30 days)');

  // Step 2: GET the confirmed file and parse it
  const res = await fetchTimeout(NALCO_BASE + foundName, {
    headers: { 'User-Agent': UA, 'Accept': 'application/pdf,*/*' },
    cf: { cacheTtl: 300 },
  }, 9000);
  if (!res.ok) throw new Error('NALCO GET failed: ' + res.status);

  const buf = new Uint8Array(await res.arrayBuffer());
  const text = await pdfToText(buf);
  const price = parseNalco(text);
  if (!price) throw new Error('NALCO price not found in ' + foundName);

  const [dd, mm, yyyy] = foundName.replace(/INGOT-/i,'').replace('.pdf','').split('-');
  return {
    perMT: price,
    perKg: Math.round((price / 1000) * 100) / 100,
    date: `${dd}-${mm}-${yyyy}`,
    grade: 'IA10',
  };
}

async function pdfToText(bytes) {
  // Do NOT use raw bytes — binary PDF data has accidental numbers.
  // Only use DECOMPRESSED stream content.
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
  let text = '';
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
    } catch (e) {}
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
  // IA10 = Aluminium Alloy Ingot (main trading grade shown to user)
  let m = t.match(/IA10\D{0,8}([0-9]{5,7})/);
  if (!m) m = t.match(/IE07\D{0,8}([0-9]{5,7})/);
  if (!m) m = t.match(/IE10\D{0,8}([0-9]{5,7})/);
  if (!m) m = t.match(/IC20\D{0,8}([0-9]{5,7})/);
  if (!m) return null;
  const v = parseInt(m[1], 10);
  return (v >= 200000 && v <= 999999) ? v : null;
}

// ============================ ALUMINIUM PRICE (Yahoo Finance) ============================
// ALI=F = COMEX aluminium futures. Prices are in USD/troy oz on Yahoo but we
// convert: 1 tonne = 26,455.3 troy oz... actually Yahoo reports ALI=F in USD per tonne
// directly. Let's verify and extract.
async function getLme() {
  const res = await fetchTimeout(YAHOO_URL, {
    headers: { 'User-Agent': UA, 'Accept': 'application/json' },
    cf: { cacheTtl: 300 },
  }, 9000);
  if (!res.ok) throw new Error('Yahoo HTTP ' + res.status);
  const j = await res.json();

  // Response: chart.result[0].meta has regularMarketPrice (latest price)
  const meta = j && j.chart && j.chart.result && j.chart.result[0] && j.chart.result[0].meta;
  if (!meta) throw new Error('Yahoo: no chart.result.meta');

  let price = meta.regularMarketPrice;
  if (!price || price < 100) throw new Error('Yahoo: price out of range: ' + price);

  // Yahoo ALI=F is quoted in USD per tonne (typically 2000-4000 range for aluminium)
  // If it looks like cents/lb (very small number), convert:
  // 1 lb = 0.000453592 tonne, so $/lb * 2204.62 = $/tonne
  if (price < 10) price = price * 2204.62; // probably $/lb

  const prevClose = meta.chartPreviousClose || meta.previousClose;
  const changePct = prevClose ? Math.round(((price - prevClose) / prevClose) * 10000) / 100 : null;

  return {
    perTonneUsd: Math.round(price * 100) / 100,
    changePct,
    label: 'Aluminium Futures (ALI=F)',
    source: 'Yahoo Finance',
  };
}

// ============================ USD-INR ============================
async function getFx() {
  for (const url of [FX_URL, FX_URL2]) {
    try {
      const r = await fetchTimeout(url, { cf: { cacheTtl: 300 } }, 7000);
      if (!r.ok) continue;
      const j = await r.json();
      const rates = j && j.rates;
      if (!rates) continue;
      const inr = rates.INR;
      const cny = rates.CNY;
      if (inr && inr > 50 && inr < 200) {
        const result = {
          usdInr: Math.round(inr * 100) / 100,
          source: url.includes('open.er') ? 'open.er-api.com' : 'exchangerate.host',
        };
        // CNY/INR = INR per 1 CNY = (INR/USD) / (CNY/USD)
        if (cny && cny > 1) {
          result.cnyInr = Math.round((inr / cny) * 100) / 100;
        }
        return result;
      }
    } catch (e) {}
  }
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
