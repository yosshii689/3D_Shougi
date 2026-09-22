// Capture presentation is separate from the rules and never changes game state.
let captureEffects, captureBanner, reserveLayer;
const captureNames={P:'槍撃',L:'長槍突貫',N:'騎兵突撃',S:'銀閃三連撃',G:'剛撃',K:'王の一太刀',B:'天空急襲',R:'戦車蹂躙'};
const clamp01=x=>Math.max(0,Math.min(1,x));
const smooth=x=>{x=clamp01(x);return x*x*(3-2*x);};

function initCapturePresentation(){
  reserveLayer=new THREE.Group();scene.add(reserveLayer);
  for(let side=0;side<2;side++){
    const x=side===0?6.35:-6.35,z=side===0?2:-2;
    box(scene,2.05,.3,4.95,0x483729,x,-.15,z);
    box(scene,1.96,.06,4.85,0x9c8259,x,.025,z);
    box(scene,1.96,.035,.13,colors[side],x,.075,z+(side===0?2.32:-2.32));
    for(let dx of [-.78,.78])for(let dz of [-2,2])box(scene,.2,.6,.2,0x3e3026,x+dx,-.55,z+dz);
    const tag=label(side===0?'赤軍':'青軍',side);tag.position.set(x,.18,z+(side===0?2.65:-2.65));tag.scale.set(.8,.5,1);scene.add(tag);
  }
  captureEffects=new THREE.Group();scene.add(captureEffects);
  captureBanner=document.createElement('div');captureBanner.id='capture-banner';captureBanner.setAttribute('aria-live','polite');$('arena').append(captureBanner);
}

function reservePosition(side,slot){
  const x=side===0?6.35:-6.35,z=side===0?2:-2;
  return new THREE.Vector3(x+((slot%4)-1.5)*.46,.08,z+(Math.floor(slot/4)-4.5)*.46);
}
function reserveSlot(side,type){let slot=0;for(const t of E.types){if(t===type)return slot+state.hands[side][t];slot+=state.hands[side][t];}return slot;}
function rebuildReserves(){
  reserveLayer.clear();
  for(let side=0;side<2;side++){
    let slot=0;
    for(const type of E.types)for(let n=0;n<state.hands[side][type];n++){
      const g=model({t:type,s:side,p:false},0,false);g.position.copy(reservePosition(side,slot++));g.scale.setScalar(.43);
      g.userData.reserve=true;g.userData.drop=type;g.userData.side=side;g.userData.index=undefined;
      g.children.filter(c=>c.isSprite).forEach(c=>c.visible=false);reserveLayer.add(g);
    }
  }
}
function selectReserve(type,side){
  if(!canPlay()||side!==state.turn)return;
  selection={drop:type};available=E.legal(state).filter(m=>m.drop===type);
  showUnit({t:type,s:side,p:false});highlight();renderHands();
  if(!available.length)notify('この持ち駒を打てるマスはありません。');
}
function disposeCaptureEffects(){
  captureEffects.children.forEach(o=>o.material?.dispose());captureEffects.clear();
}
function cleanupCapture(a=anim){
  if(a?.cinematic){
    if(a.converted)scene.remove(a.converted);
    a.hiddenLabels?.forEach(([sprite,visible])=>sprite.visible=visible);
    camera.position.copy(a.cameraStart);camera.quaternion.copy(a.cameraRotation);
  }
  if(captureEffects)disposeCaptureEffects();
  $('arena').classList.remove('in-combat','recruiting');
  if(captureBanner)captureBanner.textContent='';
}
function startCapture(a,p,q){
  a.cinematic=true;a.duration=4600;a.piece=p;a.captured=q;
  // Animate the actual pieces, on the actual board, through the existing camera.
  a.fighter=a.obj;a.defender=a.victim;
  a.direction=a.to.clone().sub(a.from).normalize();
  a.staging=a.to.clone().addScaledVector(a.direction,-.94);
  a.cameraStart=camera.position.clone();a.cameraRotation=camera.quaternion.clone();
  a.cameraFocus=a.to.clone().addScaledVector(a.direction,-.35);a.cameraFocus.y=.8;
  const perpendicular=new THREE.Vector3(-a.direction.z,0,a.direction.x);
  const scale=Math.max(1,1.1/camera.aspect),airborne=p.t==='N'||p.t==='B';
  const candidates=[1,-1].map(sign=>{
    const pos=a.cameraFocus.clone().addScaledVector(perpendicular,sign*(airborne?5.4:4.5)*scale);
    pos.addScaledVector(a.direction,-.6);pos.y=airborne?3.25:2.7;
    // Prefer the side with fewer pieces between the lens and the two combatants.
    let score=pos.distanceTo(a.cameraStart)*.015;
    const line=pos.clone().sub(a.cameraFocus),length=line.lengthSq();
    for(const [i,g] of units){if(g===a.obj||g===a.victim)continue;const point=g.position.clone();point.y=.75;
      const u=clamp01(point.clone().sub(a.cameraFocus).dot(line)/length);
      const d=point.distanceTo(a.cameraFocus.clone().addScaledVector(line,u));
      if(u>.12&&u<.9&&d<.7)score+=(.7-d)*10;
    }
    return {pos,score};
  });
  candidates.sort((x,y)=>x.score-y.score);a.cameraClose=candidates[0].pos;
  const aiming=camera.clone();aiming.position.copy(a.cameraClose);aiming.lookAt(a.cameraFocus);a.closeRotation=aiming.quaternion.clone();
  a.hiddenLabels=[];scene.traverse(o=>{if(o.isSprite){a.hiddenLabels.push([o,o.visible]);o.visible=false;}});
  captureEffects.position.copy(a.to).addScaledVector(a.direction,-.8);
  captureEffects.rotation.y=Math.atan2(-a.direction.z,a.direction.x);
  $('arena').classList.add('in-combat');
  captureBanner.textContent=(p.s===0?'赤':'青')+'軍  '+lore[p.t][0]+' ── '+captureNames[p.t];
}
function combatBurst(a){
  for(let i=0;i<48;i++){
    const m=new THREE.Mesh(geometry('IcosahedronGeometry',[.055,0]),new THREE.MeshBasicMaterial({color:i%3?0xffd77e:0xffffff,transparent:true}));
    m.scale.setScalar(.65+Math.random()*.8);
    m.position.set(.8,.6,0);m.userData.velocity=new THREE.Vector3((Math.random()-.5)*4,Math.random()*3,(Math.random()-.5)*4);
    captureEffects.add(m);
  }
  const ring=new THREE.Mesh(geometry('TorusGeometry',[.5,.022,6,48]),new THREE.MeshBasicMaterial({color:0xffd68a,transparent:true,opacity:.9}));
  ring.position.set(.7,.06,0);ring.rotation.x=Math.PI/2;ring.userData.ring=true;captureEffects.add(ring);
  for(let i=0;i<(a.piece.t==='S'?3:1);i++){
    const slash=new THREE.Mesh(geometry('TorusGeometry',[.65+i*.12,.035,6,40,Math.PI*1.2]),new THREE.MeshBasicMaterial({color:i%2?0xffffff:0xffe6a2,transparent:true,side:THREE.DoubleSide}));
    slash.position.set(.65,.75,0);slash.rotation.set(.3+i*.6,.2,-.8+i*.7);slash.userData.slash=true;captureEffects.add(slash);
  }
  a.impact=true;beep('capture');
}
function tickCapture(a,t,dt){
  const sec=(t-a.start)/1000,body=a.obj.userData.body,type=a.piece.t;
  const facing=Math.atan2(-a.direction.x,-a.direction.z);
  const arrival=smooth(sec/.82),charge=smooth((sec-.95)/.62),settle=smooth((sec-2.85)/.6);
  a.obj.position.lerpVectors(a.from,a.staging,arrival).addScaledVector(a.direction,charge*.46+settle*.48);
  body.rotation.set(0,facing,0);
  const wind=Math.sin(clamp01((sec-.65)/.55)*Math.PI);
  if(type==='N')a.obj.position.y=Math.sin(clamp01((sec-.85)/.73)*Math.PI)*.9;
  else if(type==='B'){a.obj.position.y=Math.sin(clamp01((sec-.55)/1.02)*Math.PI)*1.35;body.userData.wings?.forEach((w,k)=>w.rotation.z=(k===0?-1:1)*Math.sin(sec*17)*.75);}
  else{a.obj.position.y=Math.abs(Math.sin(sec*17))*.045*(1-settle);body.rotation.x=-wind*.18;}
  body.userData.legs?.forEach((l,k)=>l.rotation.x=Math.sin(sec*20+k*Math.PI)*.6*(1-settle));
  body.userData.wheels?.forEach(w=>w.rotation.y=-(arrival+charge)*10);
  const swing=type==='S'?Math.sin(clamp01((sec-1)/.6)*Math.PI*3):Math.sin(clamp01((sec-.92)/.66)*Math.PI);
  if(body.userData.weapon){body.userData.weapon.rotation.x=['P','L'].includes(type)?-Math.PI*.48*charge*(1-settle):1.6*wind-2.4*swing;body.userData.weapon.rotation.z=type==='S'?swing*.7:0;body.userData.weapon.position.z=-.12-(['P','L'].includes(type)?charge*.25*(1-settle):0);}
  body.userData.arms?.forEach(arm=>arm.rotation.x=-charge*1.1*(1-settle));
  a.victim.userData.body.rotation.y=facing+Math.PI;
  if(sec>=1.56&&!a.impact)combatBurst(a);
  const recoil=smooth((sec-1.56)/.5);
  a.victim.position.copy(a.to).addScaledVector(a.direction,recoil*.18);
  a.victim.userData.body.rotation.x=-recoil*1.15;
  if(sec>=2.25&&!a.converted){
    a.victim.visible=false;a.converted=model({t:a.captured.t,s:a.piece.s,p:false},0,false);
    a.converted.children.filter(c=>c.isSprite).forEach(c=>c.visible=false);scene.add(a.converted);
    a.trayTarget=reservePosition(a.piece.s,reserveSlot(a.piece.s,a.captured.t));
    captureBanner.textContent='捕獲成功！ '+(a.piece.s===0?'赤':'青')+'軍の装備へ変更 → 自軍の駒台へ';
    $('arena').classList.add('recruiting');beep('promote');
  }
  if(a.converted){
    const u=smooth((sec-2.85)/1.25);a.recruit=a.converted;
    a.converted.position.lerpVectors(a.to,a.trayTarget,u);a.converted.position.y+=Math.sin(u*Math.PI)*1.7;
    a.converted.scale.setScalar(1-u*.57);a.converted.userData.body.rotation.y=a.piece.s===0?0:Math.PI;
    a.converted.userData.body.rotation.x=-1.15*(1-smooth((sec-2.25)/.45));
  }
  for(const effect of captureEffects.children){const age=sec-1.56;
    if(effect.userData.ring){effect.scale.setScalar(1+age*3);effect.material.opacity=Math.max(0,1-age*1.7);}
    else if(effect.userData.slash){effect.rotation.z+=dt*3;effect.scale.setScalar(1+age*.6);effect.material.opacity=Math.max(0,1-age*2);}
    else{effect.position.addScaledVector(effect.userData.velocity,dt);effect.userData.velocity.y-=dt*4;effect.material.opacity=Math.max(0,1-age/1.1);}
  }
  const approach=smooth(sec/.85),back=smooth((sec-2.85)/1.5);
  camera.position.lerpVectors(a.cameraStart,a.cameraClose,approach*(1-back));
  camera.quaternion.copy(a.cameraRotation).slerp(a.closeRotation,approach*(1-back));
  if(sec>1.56&&sec<1.79)camera.position.y+=Math.sin(sec*130)*.04*(1-(sec-1.56)/.23);
  if(sec>=4.6){cleanupCapture(a);anim=null;a.done();}
}
