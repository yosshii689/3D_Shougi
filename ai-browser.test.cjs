const {chromium}=require('../Playwright/node_modules/playwright');const {pathToFileURL}=require('url');const path=require('path');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 try{
  const page=await browser.newPage({viewport:{width:1000,height:720}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
  assert.deepEqual(await page.locator('#level option').evaluateAll(options=>options.map(o=>o.value)),['1','0','2','3']);
  for(const level of ['2','3']){
   await page.selectOption('#level',level);await page.reload();assert.equal(await page.inputValue('#level'),level);
  }console.log('PASS four levels / strongest settings survive reload');
  await page.click('#resume');await page.evaluate(()=>{state=E.apply(state,E.legal(state).find(m=>m.from===54));history.push(E.copy(state));rebuild();renderUI();scheduleCPU();});
  await page.waitForFunction(()=>$('turn-hint').textContent.includes('最上級CPU'));
  // Invoke the same title button handler immediately while the asynchronous search is active.
  await page.evaluate(()=>$('menu').click());const ply=await page.evaluate(()=>state.ply);await page.waitForTimeout(400);assert.equal(await page.evaluate(()=>state.ply),ply);assert(await page.isVisible('#title-screen'));console.log('PASS opening title cancels active strongest search without a stale move');
  await page.selectOption('#level','2');await page.click('#resume');await page.waitForFunction(()=>state.ply===2&&!busy,{},{timeout:20000});
  assert.equal(await page.evaluate(()=>state.turn),0);console.log('PASS changed level resumes with exactly one legal reply');
  await page.evaluate(()=>{state=E.apply(state,E.legal(state)[0]);history.push(E.copy(state));rebuild();renderUI();$('level').value='3';epoch++;scheduleCPU();});
  await page.waitForFunction(()=>$('turn-hint').textContent.includes('最上級CPU'));await page.evaluate(()=>$('undo').click());await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>state.turn),0);assert.equal(await page.evaluate(()=>state.ply),2);console.log('PASS undo cancels pending search');
  await page.evaluate(()=>{state=E.apply(state,E.legal(state)[0]);history.push(E.copy(state));rebuild();renderUI();scheduleCPU();});
  await page.waitForFunction(()=>state.ply===4&&!busy,{},{timeout:20000});assert.equal(await page.evaluate(()=>state.turn),0);console.log('PASS strongest CPU completes its turn');
  assert.deepEqual(errors,[]);console.log('PASS local HTML / no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
