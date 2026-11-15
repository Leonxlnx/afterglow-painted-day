import puppeteer from 'puppeteer-core';
import { startServer } from '../render/server.mjs';
const server = await startServer({ port: 8797 });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
await page.goto('http://localhost:8797/tests/wc.html');
await page.waitForFunction('window.__wc', { timeout: 120000 });
console.log(JSON.stringify(await page.evaluate('window.__wc')));
await browser.close(); server.close(); process.exit(0);
