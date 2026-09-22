const {chromium}=require('../Playwright/node_modules/playwright');
const {pathToFileURL}=require('url');
const path=require('path');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(pathToFileURL(path.join(__dirname,'index.html')).href);
 await page.selectOption('#mode','local');await page.click('#resume');
 await page.evaluate(()=>{const render=renderer.render.bind(renderer);window.otherSceneRendered=false;renderer.render=(s,c)=>{if(s!==scene||c!==camera)window.otherSceneRendered=true;render(s,c);};});
 async function fixture(type,side=0){return page.evaluate(({type,side})=>{
   cleanupCapture();anim=null;busy=false;epoch++;state=E.initial();state.board.fill(null);state.turn=side;
   state.board[80]={t:'K',s:0,p:false};state.board[0]={t:'K',s:1,p:false};
   if(type==='K')state.board[side===0?80:0]=null;
   const to=type==='N'?(side===0?21:57):type==='B'?30:(side===0?31:49);
   state.board[40]={t:type,s:side,p:false};state.board[to]={t:'S',s:1-side,p:true};
   history=[E.copy(state)];records=[];ended='';selection=null;available=[];rebuild();renderUI();
   const m=E.legal(state).find(m=>m.from===40&&m.to===to&&!m.promote);if(!m)throw Error('Invalid fixture');
   const cameraBefore=camera.position.toArray();execute(m);return cameraBefore;
 },{type,side});}
 async function seek(sec){await page.evaluate(sec=>{anim.start=performance.now()-sec*1000;},sec);await page.waitForTimeout(50);}
 for(const type of ['P','L','N','S','G','K','B','R']){
   const before=await fixture(type);
   await seek(.9);assert(await page.evaluate(()=>anim.cinematic&&anim.fighter===units.get(40)&&anim.defender===units.get(anim.to.z*9+anim.to.x+40)&&camera.position.distanceTo(anim.cameraStart)>1));
   if(type==='N')await page.screenshot({path:path.join(__dirname,'capture-preview.png')});
   await seek(1.65);assert(await page.evaluate(()=>anim.impact&&captureEffects.children.length>=50));
   await seek(2.4);assert.equal(await page.evaluate(()=>anim.converted.userData.side),0);
   assert.equal(await page.evaluate(()=>anim.converted.userData.type),'S');
   await seek(3.6);assert.equal(await page.evaluate(()=>anim.recruit.userData.side),0);
   await seek(4.8);await page.waitForFunction(()=>!busy);
   assert.equal(await page.evaluate(()=>state.hands[0].S),1);
   assert.equal(await page.evaluate(()=>reserveLayer.children.length),1);
   assert.deepEqual(await page.evaluate(()=>camera.position.toArray()),before);
   console.log('PASS capture, recolor, tray, camera restore:',type);
 }
 await fixture('R',1);await seek(2.4);assert.equal(await page.evaluate(()=>anim.converted.userData.side),1);await seek(4.6);await page.waitForFunction(()=>!busy);assert.equal(await page.evaluate(()=>reserveLayer.children[0].userData.side),1);
 await page.evaluate(()=>{state.turn=1;renderUI();});
 const pt=await page.evaluate(()=>{const v=reserveLayer.children[0].position.clone();v.y+=.25;v.project(camera);const r=renderer.domElement.getBoundingClientRect();return {x:r.left+(v.x+1)*r.width/2,y:r.top+(1-v.y)*r.height/2};});
 await page.mouse.click(pt.x,pt.y);assert.equal(await page.evaluate(()=>selection?.drop),'S');console.log('PASS blue capture / clicking 3D reserve');
 await page.evaluate(()=>{state.hands[0]={R:2,B:2,G:4,S:4,N:4,L:4,P:18};rebuild();});
 assert.equal(await page.evaluate(()=>reserveLayer.children.filter(g=>g.userData.side===0).length),38);
 await page.screenshot({path:path.join(__dirname,'reserves-preview.png')});
 assert.equal(await page.evaluate(()=>window.otherSceneRendered),false);await page.reload();await page.waitForTimeout(100);await page.click('#resume');await page.evaluate(()=>{const render=renderer.render.bind(renderer);window.otherSceneRendered=false;renderer.render=(s,c)=>{if(s!==scene||c!==camera)window.otherSceneRendered=true;render(s,c);};});assert.equal(await page.evaluate(()=>reserveLayer.children[0].userData.side),1);console.log('PASS reserve capacity / saved reserves rebuild');
 await fixture('B');await seek(1);await page.evaluate(()=>newGame());assert.equal(await page.evaluate(()=>scene.children.filter(g=>g.userData.type).length),0);assert.equal(await page.evaluate(()=>busy),false);assert(!await page.evaluate(()=>$('arena').classList.contains('in-combat')));console.log('PASS restart during capture cleanup');
 await page.setViewportSize({width:390,height:844});await fixture('B');await seek(.85);await page.screenshot({path:path.join(__dirname,'capture-mobile.png')});
 assert(await page.evaluate(()=>{camera.updateMatrixWorld();return [anim.fighter,anim.defender].every(g=>{let v=g.position.clone();v.y+=.6;v.project(camera);return Math.abs(v.x)<.9&&Math.abs(v.y)<.9;});}));
 assert.equal(await page.evaluate(()=>window.otherSceneRendered),false);assert.deepEqual(errors,[]);console.log('PASS portrait framing / zero page errors');
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
