import { test, expect, type Page } from '@playwright/test';
import { getActivity } from '../../src/worldConfig';
import { getNeed } from '../../src/needs';
const member = { id:'yeji', name:'黄礼志', stageName:'YEJI', group:'ITZY', age:2000, nationality:'韩国', role:'队长', realPersonality:'温柔，喜欢美食', publicPersona:'认真', affection:40, careerPressure:20, status:'休息' };
let day=1, slot=0;
while (day<100 && (!getActivity(member.id,day,slot,member.group).available || !getNeed(member,day,slot,true))) day++;
const activity=getActivity(member.id,day,slot,member.group);
const seed={ members:[member], targets:['yeji'], history:[], identity:['圈内工作人员'], setupStep:'started',
  playerName:'测试玩家', playerAge:22, playerMoney:1000, playerMood:80, exposure:0, relationships:[],
  selectedCPs:[], collectedCards:[], playerImpact:{albumImpact:0,voteImpact:0}, worldDay:day, worldSlot:slot,
  worldLocation:activity.loc, currentScene:'测试场景', language:'simplified', turnCount:0 };
async function setup(page:Page, custom:any=seed) {
  await page.addInitScript(value => {
    localStorage.setItem('star_reality_kpop_game_state',JSON.stringify(value));
    localStorage.setItem('seen_intro_v1','1');
  },custom);
  await page.goto('/');
}
function response(n:number) {
  return '黄礼志：谢谢你过来，第'+n+'次见到你很开心。\n\nSNAPSHOT_START\n'+
    JSON.stringify({members:[{id:'yeji',affection:40+n}],hiddenSummary:'一起聊天'})+
    '\nSNAPSHOT_END\nA. 陪她坐一会儿\nB. 问问她的近况\nC. 认真听她说';
}
async function readAll(page:Page) {
  for (let i=0;i<20;i++) {
    const typing=page.getByRole('button',{name:'显示完整文字'});
    const next=page.getByRole('button',{name:'阅读下一段'});
    if (await typing.count()) { await typing.click(); continue; }
    if (await next.count()) { await next.click(); continue; }
    break;
  }
}
test('map opens as an illustrated dialog, retains locks and supports travel', async ({page})=>{
  await setup(page,{...seed,identity:['普通粉丝'],worldLocation:'cafe'});
  await page.getByRole('button',{name:'地图',exact:true}).click();
  const map=page.getByRole('dialog',{name:'城市地图'});
  await expect(map).toBeVisible();
  await expect.poll(() => map.locator('img').evaluate((img:HTMLImageElement)=>img.naturalWidth)).toBeGreaterThan(0);
  await page.screenshot({path:'test-results/map-desktop.png',fullPage:true});
  await map.getByRole('button',{name:'练习室，未解锁'}).click();
  await expect(map.getByRole('button',{name:'尚未解锁'})).toBeDisabled();
  await map.getByRole('button',{name:'汉江',exact:true}).click();
  await map.getByRole('button',{name:'前往这里'}).click();
  await expect(map).not.toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('star_reality_kpop_game_state')!).worldLocation)).toBe('hangang');
});
test('leaving and reopening resumes a conversation; care completes once and memory view is read-only', async ({page})=>{
  let calls=0;
  await page.route('**/api/chat',route=>route.fulfill({json:{choices:[{message:{content:response(++calls)}}]}}));
  await setup(page);
  await page.getByRole('button',{name:'与黄礼志交谈'}).click();
  await expect(page.getByRole('dialog',{name:'当前对话'})).toBeVisible();
  await expect(page.getByText('正在回应…',{exact:true})).not.toBeVisible();
  // 台词落在头顶气泡里，剧情框在页面下方
  await expect(page.locator('.dialogue-bubble')).toContainText('谢谢你过来');
  await readAll(page);
  await page.getByRole('button',{name:'暂别 · 进度保留'}).click();
  await page.getByRole('button',{name:'与黄礼志交谈'}).click();
  expect(calls).toBe(1);
  await readAll(page);
  await page.getByRole('button',{name:/陪她坐一会儿/}).click();
  await expect.poll(()=>calls).toBe(2);
  await readAll(page);
  await expect(page.getByRole('button',{name:'这件事已经办好 · 完成照顾'})).toBeVisible();
  await page.getByRole('button',{name:'这件事已经办好 · 完成照顾'}).click();
  await expect(page.getByText(/✓ 已完成照顾/)).toBeVisible();
  await page.getByRole('button',{name:'暂别 · 进度保留'}).click();
  await page.getByRole('button',{name:'回忆',exact:true}).click();
  await expect(page.getByText('回忆只记录已经发生的故事。')).toBeVisible();
  await expect(page.getByPlaceholder('输入你的行动...')).toHaveCount(0);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('star_reality_kpop_game_state')!));
  expect(saved.completedNeeds).toEqual([day+'-'+slot+':yeji']);
});
test('cancelled response does not mutate the save and can be retried without a duplicate user message',async({page})=>{
  let calls=0;
  await page.route('**/api/chat',async route=>{
    calls++; if(calls===1) await new Promise(r=>setTimeout(r,2500));
    await route.fulfill({json:{choices:[{message:{content:response(calls)}}]}}).catch(()=>{});
  });
  await setup(page);
  await page.getByRole('button',{name:'与黄礼志交谈'}).click();
  await page.getByRole('button',{name:'取消等待'}).click();
  await page.waitForTimeout(2800);
  let state=await page.evaluate(()=>JSON.parse(localStorage.getItem('star_reality_kpop_game_state')!));
  expect(state.history.filter((h:any)=>h.role==='assistant')).toHaveLength(0);
  // Cancel keeps a retryable action without putting an error into the story.
  await page.getByRole('button',{name:'重试刚才的行动'}).click();
  await expect.poll(()=>calls).toBe(2);
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem('star_reality_kpop_game_state')!).history.filter((h:any)=>h.role==='assistant').length)).toBe(1);
  state=await page.evaluate(()=>JSON.parse(localStorage.getItem('star_reality_kpop_game_state')!));
  expect(state.history.filter((h:any)=>h.role==='user')).toHaveLength(1);
});
test('phone portrait asks to rotate; landscape plays and legacy secrets are removed',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await setup(page,{...seed,playerApiKey:'legacy-secret'});
  const stored=await page.evaluate(()=>localStorage.getItem('star_reality_kpop_game_state'));
  expect(stored).not.toContain('legacy-secret');
  await expect(page.getByText('请横过手机游玩')).toBeVisible();
  await page.setViewportSize({width:844,height:390});
  await expect(page.getByText('请横过手机游玩')).not.toBeVisible();
  await page.getByRole('button',{name:'地图',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'城市地图'})).toBeVisible();
  await page.screenshot({path:'test-results/map-mobile.png',fullPage:true});
});

test('right dock opens on the world feed, switches tabs and collapses',async({page})=>{
  await setup(page);
  const dock=page.getByRole('complementary',{name:'世界动态与日程'});
  await expect(dock).toBeVisible();                       // 默认开在「动态」
  await expect(dock.getByText(/暂无动态/)).toBeVisible();
  await dock.getByRole('button',{name:'日程'}).click();
  await expect(dock.getByText('成员',{exact:true})).toBeVisible();
  await dock.getByRole('button',{name:'年历'}).click();
  await expect(dock.getByText(/打歌期每周/)).toBeVisible();
  await dock.getByRole('button',{name:'收起'}).click();
  await expect(dock).toHaveCount(0);
  await page.getByTitle('动态').click();                   // 顶栏按钮再开回来
  await expect(page.getByRole('complementary',{name:'世界动态与日程'})).toBeVisible();
});
test('setup wizard keeps the confirm button reachable on a landscape phone',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.addInitScript(()=>localStorage.clear());
  await page.goto('/');
  await page.getByPlaceholder('请输入角色昵称...').fill('测试玩家');
  for (let i=0;i<2;i++) await page.getByRole('button',{name:/下一步/}).click();
  await page.getByRole('button',{name:/圈内工作人员/}).click();
  await page.getByRole('button',{name:/下一步/}).click();
  await page.locator('button',{hasText:'ITZY'}).first().click();
  const start=page.getByRole('button',{name:/开始！/});
  await expect(start).toBeVisible();
  const box=(await start.boundingBox())!;
  expect(box.y + box.height).toBeLessThanOrEqual(390);    // 整个按钮都在屏幕里，点得到
});
