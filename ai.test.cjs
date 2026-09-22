const assert=require('node:assert/strict'),E=require('./engine.js'),AI=require('./ai.js');
function position(pieces){const s=E.initial();s.board.fill(null);for(const [i,t,side]of pieces)s.board[i]={t,s:side,p:false};return s;}
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function mates(s){return E.legal(s).filter(m=>{const n=E.apply(s,m);return E.check(n,n.turn)&&!E.legal(n).length;});}
(async()=>{
 const trap=position([[80,'K',0],[0,'K',1],[70,'R',1],[60,'S',1],[69,'S',0],[40,'R',0],[31,'B',1]]);trap.hands[1].G=1;
 const oldRandom=Math.random;Math.random=()=>.5;const oldMove=E.choose(trap,1);Math.random=oldRandom;
 assert(mates(E.apply(trap,oldMove)).length>0);
 for(const level of [2,3]){
   const original=JSON.stringify(trap),result=await AI.choose(trap,level);
   assert(E.legal(trap).some(m=>same(m,result.move)));assert.equal(mates(E.apply(trap,result.move)).length,0);
   assert.equal(JSON.stringify(trap),original);assert(result.completedDepth>=2);
   console.log(`PASS level ${level}: avoids immediate mate missed by standard; depth ${result.completedDepth}, ${result.nodes} nodes`);
 }
 const finish=position([[80,'K',0],[4,'K',1],[22,'G',0],[21,'L',0],[23,'L',0],[31,'R',0]]);
 for(const level of [2,3]){const r=await AI.choose(finish,level);assert(mates(finish).some(m=>same(m,r.move)));console.log(`PASS level ${level}: finds mate in one`);}
 const checked=position([[76,'K',0],[0,'K',1],[4,'R',1],[68,'G',0]]);
 const escape=await AI.choose(checked,2,{timeMs:200});assert(!E.check(E.apply(checked,escape.move),0));console.log('PASS checked king is defended');
 let cancelled=false;setTimeout(()=>cancelled=true,25);const aborted=await AI.choose(E.initial(),3,{shouldCancel:()=>cancelled});assert(aborted.cancelled);assert.equal(aborted.move,null);assert(aborted.elapsedMs<1000);console.log('PASS search cancellation');
 let heartbeats=0;const timer=setInterval(()=>heartbeats++,10);const r=await AI.choose(E.initial(),3,{timeMs:220});clearInterval(timer);assert(heartbeats>=3);assert(E.legal(E.initial()).some(m=>same(m,r.move)));assert(r.elapsedMs<1000);console.log(`PASS cooperative search: ${heartbeats} UI heartbeats / legal result at deadline`);
 const zero=await AI.choose(E.initial(),2,{timeMs:0});assert(E.legal(E.initial()).some(m=>same(m,zero.move)));console.log('PASS deadline before first completed iteration still yields a legal move');
})().catch(e=>{console.error(e);process.exitCode=1;});
