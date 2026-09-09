import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';
const edge='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
export default defineConfig({
  testDir:'./tests/browser', timeout:30000, workers:1,
  use:{baseURL:'http://127.0.0.1:8080',headless:true,viewport:{width:1365,height:900},reducedMotion:'reduce',
    launchOptions:existsSync(edge)?{executablePath:edge}:{}},
  webServer:{command:'node server.mjs',url:'http://127.0.0.1:8080',reuseExistingServer:true,timeout:120000},
});
