import { parseContentBlocks } from '../src/story.ts';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMemberSnapshot, validateSnapshot, withoutSecrets, restoreGame, encounterKey, migrateStoredSecrets } from '../src/gameState.ts';
import { dmReply, socialEvent } from '../src/socialSimulation.ts';
import { requestChat, setSessionApiKey, getSessionApiKey } from '../src/chatClient.ts';
import { validateChat, proxyChat, takeQuota } from '../server/chat.mjs';
import { safeStaticPath } from '../server.mjs';
const member: any = { id: 'a', name: 'Alice', group: 'G', affection: 40, careerPressure: 20, status: '休息', realPersonality: '温柔', publicPersona: '' };
const state: any = { members: [member], targets: ['a'], history: [], playerImpact: { albumImpact: 0, voteImpact: 0 } };

test('AI patches cannot rename characters or overwrite biographies, and numbers stay finite and bounded', () => {
  const [result] = applyMemberSnapshot([member], [{ id: 'a', name: 'ATTACK', realPersonality: 'changed', affection: 999, careerPressure: NaN, unknown: true }]);
  assert.equal(result.name, 'Alice'); assert.equal(result.realPersonality, '温柔');
  assert.equal(result.affection, 100); assert.equal(result.careerPressure, 20);
  assert.deepEqual(applyMemberSnapshot([member], {}), [member]);
  assert.deepEqual(applyMemberSnapshot([member], [{ id: 'a', affection: '100' }]), [member]);
  assert.equal(validateSnapshot([]), null);
});
test('save serialization and migrations remove nested credentials without dropping story data', () => {
  const raw = { ...state, playerApiKey: 'secret', history: [{ role: 'user', content: 'hello', apiKey: 'secret2' }] };
  const clean = withoutSecrets(raw);
  assert.equal(JSON.stringify(clean).includes('secret'), false);
  assert.equal(restoreGame(raw, state).history[0].content, 'hello');
  assert.deepEqual(restoreGame({ members: 'broken' }, state), state);
  const values = new Map([['save_data_1', JSON.stringify(raw)], ['wallpaper', 'unchanged']]);
  migrateStoredSecrets({ get length() { return values.size; }, key: (i: number) => [...values.keys()][i],
    getItem: (k: string) => values.get(k), setItem: (k: string,v: string) => values.set(k,v) } as any);
  assert.equal(values.get('save_data_1')!.includes('secret'), false);
  assert.equal(values.get('wallpaper'), 'unchanged');
  setSessionApiKey('  in-memory  '); assert.equal(getSessionApiKey(), 'in-memory'); setSessionApiKey('');
});
test('encounters separate location and time but preserve the same participants in any order', () => {
  assert.equal(encounterKey(1,0,'cafe',['a','b']), encounterKey(1,0,'cafe',['b','a']));
  assert.notEqual(encounterKey(1,0,'cafe',['a']), encounterKey(1,1,'cafe',['a']));
  assert.notEqual(encounterKey(1,0,'dorm@G',['a']), encounterKey(1,0,'dorm@H',['a']));
});
test('messages answer the selected action and never promise an unimplemented scheduled meeting', () => {
  assert.match(dmReply('invite', { affection: 0 }, false), /熟悉/);
  assert.match(dmReply('invite', { affection: 80 }, true), /不约/);
  assert.match(dmReply('encourage', { affection: 80 }, false), /谢谢|你这句话/);
  assert.doesNotMatch(dmReply('invite', { affection: 80 }, false), /下个时段/);
});
test('social events are deterministic and do not always grant affinity', () => {
  const b = { ...member, id: 'b', name: 'Bob' };
  let happened = 0, missed = 0;
  for (let day = 1; day <= 50; day++) {
    const e = socialEvent(member,b,{affinity:40,tension:20},'咖啡厅',day);
    assert.deepEqual(e, socialEvent(member,b,{affinity:40,tension:20},'咖啡厅',day));
    e ? happened++ : missed++;
  }
  assert.ok(happened > 0 && missed > 0);
});
test('API rejects malformed bodies and clamps spending controls', async () => {
  assert.equal(validateChat({ model:'x', messages:[] }), null);
  assert.equal(validateChat({ model:'deepseek-chat', messages:[{role:'root',content:'x'}] }), null);
  const body = { model:'deepseek-chat', messages:[{role:'user',content:'hello'}], max_tokens:999999 };
  assert.equal(validateChat(body)!.max_tokens,4096);
  assert.equal((await proxyChat(body)).status,503);
  let request: any;
  const result = await proxyChat({...body,apiKey:'test-key'}, { fetchImpl: (async (_url:any, options:any) => {
    request=options; return new Response(JSON.stringify({choices:[{message:{content:'ok'}}]}),{status:200});
  }) as any });
  assert.equal(result.status,200); assert.equal(JSON.parse(request.body).apiKey,undefined);
  assert.equal(takeQuota('test-user',0,1),true); assert.equal(takeQuota('test-user',1,1),false);
  assert.equal(takeQuota('test-user',3600001,1),true);
});
test('static server rejects traversal and malformed encoding', () => {
  assert.equal(safeStaticPath('/../dist-private/key'),null);
  assert.equal(safeStaticPath('/%2e%2e/secret'),null);
  assert.equal(safeStaticPath('/%invalid'),null);
  assert.ok(safeStaticPath('/assets/app.js')?.includes('assets'));
});
test('cancelled chat never retries; business errors are not retried', async () => {
  const oldFetch = globalThis.fetch;
  let calls=0;
  try {
    globalThis.fetch = async (_input:any, options:any) => new Promise((_resolve,reject) => {
      calls++; options.signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});
    });
    const controller = new AbortController();
    const pending=requestChat('{}',{signal:controller.signal});
    controller.abort();
    await assert.rejects(pending,{name:'AbortError'}); assert.equal(calls,1);
    calls=0;
    globalThis.fetch = async () => { calls++; return new Response('{}',{status:401}); };
    await assert.rejects(requestChat('{}'),/Key/); assert.equal(calls,1);
  } finally { globalThis.fetch=oldFetch; }
});

test('malformed social blocks cannot pass objects into React text or invalid array methods', () => {
  const blocks:any[] = parseContentBlocks('THEQOO_START\n{"title":{"bad":1},"comments":"not-an-array"}\nTHEQOO_END');
  assert.equal(blocks.length,1); assert.equal(blocks[0].data.title,undefined); assert.deepEqual(blocks[0].data.comments,[]);
  assert.deepEqual(parseContentBlocks('KKTMSG_START\nnull\nKKTMSG_END'),[]);
});
