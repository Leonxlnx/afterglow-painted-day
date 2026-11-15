import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', protocolTimeout: 600000,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--window-size=1280,720'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 720 });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto('http://localhost:8787/', { waitUntil: 'domcontentloaded', timeout: 0 });
await page.waitForFunction('window.__ready === true', { timeout: 600000 });
await page.click('#enter');
await new Promise(r => setTimeout(r, 6000));
await page.screenshot({ path: 'out/demo_check.png' });
const st = await page.evaluate(() => ({ t: document.getElementById('time').textContent, scale: window.__scale, cw: document.getElementById('c').width }));
console.log(JSON.stringify(st), 'errors:', errs.filter(e => !/404/.test(e)).slice(0, 5));
await browser.close(); process.exit(0);
