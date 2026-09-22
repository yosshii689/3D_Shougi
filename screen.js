function refreshTitle(){
  $('resume').textContent=state.ply||ended?'対局に戻る':'対局を始める';
  $('save-status').textContent=ended|| (state.ply?`${state.ply}手まで進行 · ${state.turn===0?'赤':'青'}軍の手番から再開`:'赤軍から、最初の一手を。');
}
function enterBattle(){
  menuOpen=false;$('title-screen').hidden=true;document.body.classList.remove('at-title');
  resize();renderUI();scheduleCPU();
}
function openTitle(){
  if(busy)return;epoch++;menuOpen=true;selection=null;available=[];highlight();save();
  $('selected-unit').hidden=true;$('title-screen').hidden=false;document.body.classList.add('at-title');refreshTitle();
}
function titleTab(records){
  $('play-panel').hidden=records;$('record-panel').hidden=!records;
  $('tab-play').classList.toggle('active',!records);$('tab-record').classList.toggle('active',records);
  $('tab-play').setAttribute('aria-pressed',!records);$('tab-record').setAttribute('aria-pressed',records);
}
$('resume').onclick=enterBattle;$('menu').onclick=openTitle;
$('tab-play').onclick=()=>titleTab(false);$('tab-record').onclick=()=>titleTab(true);
$('restart').onclick=()=>{
  const begin=()=>{newGame();enterBattle();};
  if(history.length>1)confirmAction('新しい対局を始めますか？','現在の棋譜と局面を初期化します。続ける場合はキャンセルして「対局に戻る」を選んでください。',begin);
  else begin();
};
$('fullscreen').onclick=async()=>{
  try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
  catch{notify('全画面に切り替えられませんでした。F11でも全画面表示にできます。');}
};
document.addEventListener('fullscreenchange',()=>{$('fullscreen').textContent=document.fullscreenElement?'全画面を解除':'全画面表示';resize();});
refreshTitle();
