import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
// 容器/CI 里自带的 Chromium 版本常和 @playwright/test 对不上，用这个变量直接指过去
const browser=process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync(edge) ? edge : '');
export default defineConfig({
  testDir:'./tests/browser', timeout:30000, workers:1,
  use:{baseURL:'http://127.0.0.1:8080',headless:true,viewport:{width:1365,height:900},reducedMotion:'reduce',
    launchOptions:browser?{executablePath:browser}:{}},
  webServer:{command:'node server.mjs',url:'http://127.0.0.1:8080',reuseExistingServer:true,timeout:120000},
});
