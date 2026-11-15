import puppeteer from 'puppeteer-core';
import { startServer } from '../render/server.mjs';
const server = await startServer({ port: 8799 });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader=false'] });
const page = await browser.newPage();
await page.goto('http://localhost:8799/tests/cap.html');
await page.waitForFunction('window.__cap');
console.log(JSON.stringify(await page.evaluate('window.__cap'), null, 1));
await browser.close(); server.close();
