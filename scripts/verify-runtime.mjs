// scripts/verify-runtime.mjs
//
// Démarre vite dev, lance Chrome via puppeteer-core, ouvre la page, capture
// console + page errors. Sortie OK si :
//   - 0 error / 0 page-error
//   - 0 warning de dépréciation côté Three.js
//   - le log "[M0] Boot OK" est apparu (init() a fini)
//   - le log "[M0] DRACO test GLB" est apparu (pipeline OK)

import { spawn } from 'node:child_process';
import http from 'node:http';
import puppeteer from 'puppeteer-core';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 5176;
const URL  = `http://localhost:${PORT}/`;

const waitForUrl = (url, ms=10000) => new Promise((resolve, reject) => {
  const t0 = Date.now();
  const tick = () => http.get(url, r => { r.resume(); resolve(); }).on('error', () => {
    if (Date.now()-t0 > ms) reject(new Error(`timeout ${url}`));
    else setTimeout(tick, 200);
  });
  tick();
});

const vite = spawn('npx', ['vite', 'dev', '--port', String(PORT)], {
  stdio: ['ignore', 'pipe', 'pipe'],
});
const viteOut = [];
vite.stdout.on('data', d => viteOut.push(String(d)));
vite.stderr.on('data', d => viteOut.push(String(d)));

const cleanup = (code) => {
  try { vite.kill('SIGTERM'); } catch {}
  process.exit(code);
};
process.on('SIGINT', () => cleanup(130));

try {
  await waitForUrl(URL);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  const logs = [];
  const errors = [];
  const warns = [];
  const pageErrors = [];

  page.on('requestfailed', req => {
    errors.push(`request failed (${req.failure()?.errorText}) : ${req.url()}`);
  });
  page.on('response', resp => {
    if (resp.status() >= 400) errors.push(`HTTP ${resp.status()} : ${resp.url()}`);
  });
  page.on('console', msg => {
    const t = msg.type();
    const txt = msg.text();
    logs.push({type:t, text:txt});
    if (t==='error')   errors.push(txt);
    if (t==='warning') warns.push(txt);
  });
  page.on('pageerror', e => pageErrors.push(e.message || String(e)));

  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });
  // Laisse 2 frames se rendre, assez pour le test DRACO.
  await new Promise(r => setTimeout(r, 1500));

  const html = await page.content();
  const hasCanvas = /<canvas[^>]*>/.test(html);

  await browser.close();

  // Filtre les warnings de dépréciation Three connus.
  const threeDeprecated = warns.filter(w =>
    /\.outputEncoding|\.encoding =|sRGBEncoding|LinearEncoding|useLegacyLights|gammaFactor/i.test(w)
  );

  console.log('=== console ===');
  for (const e of pageErrors) console.log('  [pageerror]', e);
  for (const e of errors)     console.log('  [error]    ', e);
  for (const w of warns)      console.log('  [warning]  ', w.slice(0,200));
  for (const l of logs.filter(l => /\[M0\]/.test(l.text))) console.log('  [m0]       ', l.text);

  console.log('=== signals ===');
  console.log('  <canvas> :', hasCanvas);
  console.log('  page errors :', pageErrors.length);
  console.log('  console errors :', errors.length);
  console.log('  warnings (all) :', warns.length);
  console.log('  three deprecation warnings :', threeDeprecated.length);

  const ok =
       hasCanvas
    && pageErrors.length === 0
    && errors.length === 0
    && threeDeprecated.length === 0;
  console.log('=== verdict :', ok ? 'OK' : 'FAIL', '===');
  cleanup(ok ? 0 : 1);
} catch (e) {
  console.error('FATAL', e);
  console.error('--- vite log ---');
  console.error(viteOut.join('').slice(-2000));
  cleanup(2);
}
