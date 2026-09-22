const assert=require('node:assert/strict');
const E=require('./engine.js');
let count=0;
function test(name,fn){fn();count++;console.log('PASS',name);}
function empty(){let s=E.initial();s.board.fill(null);s.board[80]={t:'K',s:0,p:false};s.board[0]={t:'K',s:1,p:false};return s;}
function put(s,i,t,side=0,p=false){s.board[i]={t,s:side,p};}
test('初期配置40駒 / 先手の合法手30',()=>{let s=E.initial();assert.equal(s.board.filter(Boolean).length,40);assert.equal(E.legal(s).length,30);});
test('桂は駒を飛び越える / 後手の方向',()=>{let s=empty();put(s,40,'N');put(s,31,'P');assert.deepEqual(E.targets(s,40).sort(),[21,23]);put(s,40,'N',1);assert.deepEqual(E.targets(s,40).sort(),[57,59]);});
test('香は味方の駒を飛び越せない',()=>{let s=empty();put(s,58,'L');put(s,40,'P');assert.deepEqual(E.targets(s,58),[49]);assert.deepEqual(E.targets(s,58,true),[49,40]);});
test('成りの選択 / 強制成り',()=>{let s=empty();put(s,31,'P');let ms=E.legal(s).filter(m=>m.from===31&&m.to===22);assert.equal(ms.length,2);put(s,13,'P');ms=E.legal(s).filter(m=>m.from===13&&m.to===4);assert.equal(ms.length,1);assert.equal(ms[0].promote,true);});
test('成桂は金 / 龍・馬の追加移動',()=>{let s=empty();put(s,40,'N',0,true);assert.equal(E.targets(s,40).length,6);put(s,40,'B',0,true);assert(E.targets(s,40).includes(31));put(s,40,'R',0,true);assert(E.targets(s,40).includes(30));});
test('成駒の捕獲で成りが解除され自軍の持ち駒になる',()=>{let s=empty();put(s,40,'R');put(s,31,'S',1,true);let n=E.apply(s,{from:40,to:31});assert.equal(n.hands[0].S,1);assert.equal(s.hands[0].S,0);n.turn=0;let d=E.apply(n,{drop:'S',to:50});assert.deepEqual(d.board[50],{t:'S',s:0,p:false});});
test('二歩防止 / と金は二歩に数えない',()=>{let s=empty();put(s,58,'P');s.hands[0].P=1;assert(!E.legal(s).some(m=>m.drop==='P'&&m.to%9===4));s.board[58].p=true;assert(E.legal(s).some(m=>m.drop==='P'&&m.to%9===4));});
test('行き所のない持ち駒は禁止',()=>{let s=empty();s.hands[0].P=1;s.hands[0].L=1;s.hands[0].N=1;assert(!E.legal(s).some(m=>m.drop&&m.to<9));assert(!E.legal(s).some(m=>m.drop==='N'&&m.to<18));});
test('王手放置とピンされた金の移動を防止',()=>{let s=empty();s.board[80]=null;put(s,76,'K');put(s,4,'R',1);put(s,67,'G');assert(!E.check(s,0));assert(!E.legal(s).some(m=>m.from===67&&m.to===57));s.board[67]=null;assert(E.check(s,0));assert(E.legal(s).every(m=>!E.check(E.apply(s,m),0)));});
test('王同士は隣接できない / 王の捕獲手なし',()=>{let s=empty();s.board[0]=null;put(s,60,'K',1);assert(!E.legal(s).some(m=>m.from===80&&m.to===70));});
test('打ち歩詰めは禁止 / 逃げ道があれば許可',()=>{let s=empty();s.board[0]=null;put(s,4,'K',1);put(s,22,'G');put(s,21,'L');put(s,23,'L');s.hands[0].P=1;assert(!E.legal(s).some(m=>m.drop==='P'&&m.to===13));let n=E.apply(s,{drop:'P',to:13});assert(E.check(n,1));assert.equal(E.legal(n).length,0);s.board[21]=null;assert(E.legal(s).some(m=>m.drop==='P'&&m.to===13));});
test('千日手 / 連続王手の千日手',()=>{let s=empty(),h=[s];for(let k=0;k<3;k++)for(let [from,to]of [[80,79],[0,1],[79,80],[1,0]]){s=E.apply(s,{from,to});h.push(s);}assert.deepEqual(E.repetition(h),{draw:true});s=empty();s.board[0]=null;put(s,4,'K',1);put(s,21,'R');h=[s];for(let k=0;k<3;k++)for(let [from,to]of [[21,22],[4,3],[22,21],[3,4]]){s=E.apply(s,{from,to});h.push(s);}assert.deepEqual(E.repetition(h),{loser:0});});
test('80手のCPU対戦で常に合法手・駒総数40を維持',()=>{let s=E.initial();for(let i=0;i<80;i++){let legal=E.legal(s);if(!legal.length)break;let m=E.choose(s,i%4===0?1:0);assert(legal.some(a=>JSON.stringify(a)===JSON.stringify(m)));s=E.apply(s,m);assert(!E.check(s,1-s.turn));let total=s.board.filter(Boolean).length+s.hands.reduce((a,h)=>a+Object.values(h).reduce((b,n)=>b+n,0),0);assert.equal(total,40);}});
console.log(`${count} tests passed`);
