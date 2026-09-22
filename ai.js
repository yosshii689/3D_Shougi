(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine.js'):root.Shogi;
const values={K:0,R:1000,B:850,G:600,S:500,N:350,L:300,P:100};
const MATE=100000,STOP=Symbol('search stopped');
const profiles={2:{name:'上級',depth:3,time:1000,qdepth:2},3:{name:'最上級',depth:5,time:3200,qdepth:4}};
const pieceValue=p=>values[p.t]+(p.p?(p.t==='R'||p.t==='B'?280:600-values[p.t]):0);
function evaluate(s){
  const kings=[s.board.findIndex(p=>p&&p.s===0&&p.t==='K'),s.board.findIndex(p=>p&&p.s===1&&p.t==='K')];
  const attacks=[new Uint8Array(81),new Uint8Array(81)];
  let score=0;
  s.board.forEach((p,i)=>{
    if(!p)return;const sign=p.s===s.turn?1:-1,y=Math.floor(i/9),progress=p.s===0?8-y:y;
    const influence=E.targets(s,i,true);influence.forEach(j=>attacks[p.s][j]++);const mobility=influence.filter(j=>!s.board[j]||s.board[j].s!==p.s).length;
    let v=pieceValue(p);
    if(p.t!=='K'){
      v+=Math.min(progress,6)*(p.t==='P'?9:3)+(4-Math.abs(i%9-4))*4;
      v+=mobility*(p.t==='R'||p.t==='B'?4:2);
      if(['G','S'].includes(p.t)||p.p&&['P','L','N'].includes(p.t)){
        const k=kings[p.s],d=Math.max(Math.abs(i%9-k%9),Math.abs(y-Math.floor(k/9)));
        v+=Math.max(0,3-d)*14;
      }
    }else v-=progress*6;
    score+=sign*v;
  });
  s.board.forEach((p,i)=>{
    if(!p)return;const sign=p.s===s.turn?1:-1,enemy=attacks[1-p.s][i];
    if(p.t!=='K'&&enemy)score-=sign*(attacks[p.s][i]?pieceValue(p)*.035:pieceValue(p)*.18);
    if(p.t==='K'){
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){
        const x=i%9+dx,y=Math.floor(i/9)+dy;if(x<0||x>8||y<0||y>8)continue;
        score-=sign*attacks[1-p.s][y*9+x]*22;
      }
    }
  });
  for(let side=0;side<2;side++)for(const t of E.types)score+=(side===s.turn?1:-1)*s.hands[side][t]*values[t]*1.12;
  return score;
}
const moveKey=m=>m?`${m.drop||m.from}:${m.to}:${m.promote?1:0}`:'';
function order(s,moves,preferred){
  return moves.map(m=>{
    let v=moveKey(m)===preferred?1000000:0;
    if(s.board[m.to])v+=pieceValue(s.board[m.to])*12-(m.drop?values[m.drop]:pieceValue(s.board[m.from]));
    if(m.promote)v+=600;
    if(m.drop){const king=s.board.findIndex(p=>p&&p.t==='K'&&p.s!==s.turn);v+=Math.max(0,6-Math.abs(m.to%9-king%9)-Math.abs(Math.floor(m.to/9)-Math.floor(king/9)))*12;}
    return {m,v};
  }).sort((a,b)=>b.v-a.v).map(x=>x.m);
}
async function choose(s,level=2,options={}){
  const profile=profiles[level]||profiles[2],start=performance.now();
  const deadline=start+(options.timeMs??profile.time),maxDepth=options.maxDepth??profile.depth;
  const history=options.history?.slice()||[s];if(E.key(history.at(-1))!==E.key(s))history.push(s);
  const counts=new Map();for(const position of history){const k=E.key(position);counts.set(k,(counts.get(k)||0)+1);}
  const preferred=new Map();let nodes=0,completedDepth=0,timedOut=false,cancelled=false;
  let lastYield=performance.now();
  async function checkpoint(){
    nodes++;
    if(options.shouldCancel?.()){cancelled=true;throw STOP;}
    if(performance.now()>=deadline){timedOut=true;throw STOP;}
    if(performance.now()-lastYield>=8){await new Promise(resolve=>setTimeout(resolve,0));lastYield=performance.now();
      if(options.shouldCancel?.()){cancelled=true;throw STOP;}
    }
  }
  async function descend(position,m,depth,alpha,beta,ply,qdepth){
    const next=E.apply(position,m),k=E.key(next);history.push(next);counts.set(k,(counts.get(k)||0)+1);
    try{return -await search(next,depth,-beta,-alpha,ply+1,qdepth);}
    finally{history.pop();counts.set(k,counts.get(k)-1);}
  }
  async function search(position,depth,alpha,beta,ply,qdepth){
    await checkpoint();const k=E.key(position);
    if(counts.get(k)>=4){const rep=E.repetition(history);if(rep)return rep.draw?0:(rep.loser===position.turn?-MATE+ply:MATE-ply);}
    let moves=E.legal(position);if(!moves.length)return -MATE+ply;
    const checked=E.check(position,position.turn);
    if(depth<=0){
      const standing=evaluate(position);
      if(qdepth<=0)return standing-(checked?90:0);
      if(!checked){if(standing>=beta)return standing;alpha=Math.max(alpha,standing);moves=moves.filter(m=>position.board[m.to]||m.promote);}
      // In check, search all evasions; never assume the checked side can pass.
      for(const m of order(position,moves,preferred.get(k))){
        const v=await descend(position,m,0,alpha,beta,ply,qdepth-1);if(v>=beta)return v;alpha=Math.max(alpha,v);
      }
      return alpha;
    }
    let best=-Infinity,bestMove=null;
    for(const m of order(position,moves,preferred.get(k))){
      const v=await descend(position,m,depth-1,alpha,beta,ply,qdepth);
      if(v>best){best=v;bestMove=m;}alpha=Math.max(alpha,v);if(alpha>=beta)break;
    }
    preferred.set(k,moveKey(bestMove));return best;
  }
  const legal=E.legal(s);if(!legal.length)return {move:null,completedDepth,nodes,cancelled:false,elapsedMs:performance.now()-start};
  let move=order(s,legal)[0],score=-Infinity;
  try{
    for(let depth=1;depth<=maxDepth;depth++){
      let best=-Infinity,bestMove=move;
      for(const candidate of order(s,legal,moveKey(move))){
        const v=await descend(s,candidate,depth-1,best,Infinity,0,profile.qdepth);
        if(v>best){best=v;bestMove=candidate;}
      }
      move=bestMove;score=best;completedDepth=depth;
      options.onProgress?.({completedDepth,nodes,elapsedMs:performance.now()-start});
      if(best>MATE-1000)break;
      await new Promise(resolve=>setTimeout(resolve,0));
    }
  }catch(error){if(error!==STOP)throw error;}
  return {move:cancelled?null:move,score,completedDepth,nodes,cancelled,timedOut,elapsedMs:performance.now()-start};
}
const api={choose,evaluate,profiles};if(typeof module!=='undefined')module.exports=api;root.ShogiAI=api;
})(typeof window!=='undefined'?window:globalThis);
