import { chromium } from 'playwright-core';
const card = `旁白：练习室，她在压腿。
黄礼志：「你也来了。」
CARD_START
{"name":"黄礼志","stageName":"Yeji","group":"ITZY","status":"活动","publicPersona":"队长","realPersonality":"要强","weaknesses":["逞强"],"hiddenStory":"x"}
CARD_END
A. 陪她拉伸
B. 递水
C. 站着看
SNAPSHOT_START
{"members":[{"id":"yeji","affection":11,"careerPressure":40,"status":"练习"}],"currentScene":"练习室","weekCount":1,"isWeekEnd":false,"hiddenSummary":"练习室初遇。","isComebackSetting":false,"groupHeats":[]}
SNAPSHOT_END`;
const reply2 = `黄礼志接过水，喝了一口。
黄礼志：「谢了。」她把瓶子搁在镜子边。
A. 问她累不累
B. 陪她再练一组
C. 先走
SNAPSHOT_START
{"members":[{"id":"yeji","affection":13,"careerPressure":40,"status":"喝水"}],"currentScene":"练习室","weekCount":1,"isWeekEnd":false,"hiddenSummary":"递了水，她道谢。","isComebackSetting":false,"groupHeats":[]}
SNAPSHOT_END`;
let calls=0;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:false,args:['--headless=new','--no-sandbox']});
const p=await b.newPage({viewport:{width:1280,height:800}}); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('**/api/chat',r=>{calls++; r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({choices:[{message:{content: calls===1?card:reply2}}]})});});
await p.goto('http://localhost:4173',{waitUntil:'networkidle'}); await p.waitForTimeout(400);
await p.locator('input[type="text"]').first().fill('小北'); await p.getByRole('button',{name:/下一步/}).click();
await p.getByRole('button',{name:/下一步/}).click(); await p.getByText('普通粉丝',{exact:false}).first().click(); await p.getByRole('button',{name:/下一步/}).click();
await p.waitForTimeout(300); await p.locator('button',{hasText:/^ITZY$/}).first().click(); await p.waitForTimeout(300);
await p.locator('.grid button',{hasText:/礼志/}).first().click(); await p.getByRole('button',{name:/开始/}).click();
await p.waitForTimeout(2500);
// seed a slot where yeji is present & no need bubble complication: patch to practice_room morning where she practices
await p.evaluate(()=>{const K='star_reality_kpop_game_state';const s=JSON.parse(localStorage.getItem(K));s.worldDay=1;s.worldSlot=0;s.worldLocation='practice_room';s.members=s.members.map(m=>m.id==='yeji'?{...m,affection:11}:m);s.actionUsedAt=undefined;localStorage.setItem(K,JSON.stringify(s));});
await p.reload({waitUntil:'networkidle'}); await p.waitForTimeout(1000);
const callsBefore = calls;
// click yeji to open a scene (talk). find her sprite name label on the map and click the wrapper
await p.getByText('黄礼志',{exact:true}).last().click({force:true}).catch(async()=>{ await p.getByText('黄礼志',{exact:false}).last().click({force:true}); });
await p.waitForTimeout(2600);
const afterTalk = calls;
const sceneText1 = await p.locator('body').innerText().catch(()=> '');
const inScene = sceneText1.includes('压腿')||sceneText1.includes('你也来了')||sceneText1.includes('练习');
// advance the VN dialogue to the end by clicking the story box a few times, then pick option B (递水)
for (let i=0;i<4;i++){ await p.locator('body').click({position:{x:640,y:730}}).catch(()=>{}); await p.waitForTimeout(300); }
// click an option button containing 递水
let picked=false;
try { await p.getByRole('button').filter({hasText:/递水/}).first().click({force:true}); picked=true; } catch(e){ errs.push('pick:'+e.message); }
await p.waitForTimeout(2600);
const afterPick = calls;
const body2 = await p.locator('body').innerText().catch(()=> '');
console.log(JSON.stringify({ callsBefore, afterTalk, inScene, picked, afterPick, replied2: afterPick>afterTalk, reply2Shown: body2.includes('谢了')||body2.includes('喝了一口'), errors: errs.slice(0,3) }, null, 2));
await p.screenshot({path:'/tmp/claude-0/-home-user-idolTomodachiLifev2/558685d3-5577-5afe-9e87-5a7f58fcb4be/scratchpad/reply.png'});
await b.close();
