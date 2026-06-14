'use client';
/* Three.js scene library — browser only (use client keeps it out of SSR) */
import * as THREE from 'three';
import { CHAPTERS, bn, B } from '@/data/chapters';

/* ─── tiny helpers ─── */
const mat  = (c,e,ei=0.8,op) => new THREE.MeshStandardMaterial({color:c,emissive:e||0,emissiveIntensity:ei,transparent:op!=null,opacity:op??1});
const bmat = (c) => new THREE.MeshBasicMaterial({color:c});
const sph  = (r,m) => new THREE.Mesh(new THREE.SphereGeometry(r,20,20),m);
const bx   = (w,h,d,m) => new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
const cy   = (r1,r2,h,m,s=14) => new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,s),m);
const seg  = (pts,color,dashed) => {
  const g=new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(...p)));
  const l=new THREE.Line(g,dashed?new THREE.LineDashedMaterial({color,dashSize:.2,gapSize:.13}):new THREE.LineBasicMaterial({color}));
  if(dashed)l.computeLineDistances();return l;
};
const arw  = (len,color) => {
  const g=new THREE.Group();
  const s=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1,8),bmat(color));
  s.rotation.z=-Math.PI/2;s.position.x=.5;
  const h=new THREE.Mesh(new THREE.ConeGeometry(.14,.3,12),bmat(color));
  h.rotation.z=-Math.PI/2;h.position.x=1.15;
  g.add(s,h);g.scale.x=len;
  g.userData.setLen=L=>{g.scale.x=Math.max(.05,L);};
  return g;
};

/* ─── environment builders ─── */
const skyTex=stops=>{
  const c=document.createElement('canvas');c.width=2;c.height=256;
  const g=c.getContext('2d'),gr=g.createLinearGradient(0,0,0,256);
  stops.forEach(([o,col])=>gr.addColorStop(o,col));
  g.fillStyle=gr;g.fillRect(0,0,2,256);return new THREE.CanvasTexture(c);
};
const sky=(scene,stops,fogColor,n=16,f=42)=>{
  scene.background=skyTex(stops);
  scene.fog=new THREE.Fog(new THREE.Color(fogColor),n,f);
};
const radTex=(inn,out)=>{
  const c=document.createElement('canvas');c.width=c.height=256;
  const g=c.getContext('2d'),gr=g.createRadialGradient(128,128,10,128,128,128);
  gr.addColorStop(0,inn);gr.addColorStop(1,out);
  g.fillStyle=gr;g.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);
};
const ground=(scene,r,inn,out,y=0)=>{
  const m=new THREE.Mesh(new THREE.CircleGeometry(r,40),new THREE.MeshStandardMaterial({map:radTex(inn,out)}));
  m.rotation.x=-Math.PI/2;m.position.y=y;scene.add(m);return m;
};
const addSun=(scene,x=9,y=9,z=-6)=>{
  const s=sph(.8,bmat(0xffe27d));s.position.set(x,y,z);scene.add(s);
  const l=new THREE.PointLight(0xfff2c0,.55,70);l.position.set(x,y,z);scene.add(l);
};
const addClouds=(scene,n=3)=>{
  const list=[];
  for(let i=0;i<n;i++){
    const g=new THREE.Group();
    const m=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xcfe8ff,emissiveIntensity:.15});
    [[0,0,0,.7],[.7,.12,.1,.5],[-.65,.1,-.1,.55],[.2,.35,0,.45]]
      .forEach(([x,y,z,r])=>{const s=sph(r,m);s.position.set(x,y,z);g.add(s);});
    g.position.set(-12+i*8+Math.random()*3,5.5+i*.8,-7-i*2);
    g.userData.v=.25+Math.random()*.25;scene.add(g);list.push(g);
  }
  return dt=>list.forEach(c=>{c.position.x+=c.userData.v*dt;if(c.position.x>14)c.position.x=-14;});
};
const addTree=(scene,x,z,s=1)=>{
  const g=new THREE.Group();
  const tr=cy(.12*s,.18*s,1.1*s,mat(0x8a5a2b));tr.position.y=.55*s;g.add(tr);
  [[0,1.4,0,.75],[.4,1.1,.2,.5],[-.42,1.15,-.15,.55]].forEach(([px,py,pz,r])=>{
    const f=sph(r*s,mat(0x2f9e44,0x14532d,.25));f.position.set(px*s,py*s,pz*s);g.add(f);
  });
  g.position.set(x,0,z);scene.add(g);
};
const addPerson=(shirt=0xff7043,pants=0x3949ab)=>{
  const g=new THREE.Group(),skin=0xffcf9f;
  [-.1,.1].forEach(x=>{const l=cy(.07,.08,.5,mat(pants));l.position.set(x,.25,0);g.add(l);});
  const body=cy(.16,.2,.55,mat(shirt));body.position.y=.78;g.add(body);
  const head=sph(.16,mat(skin));head.position.y=1.22;g.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.165,12,12,0,Math.PI*2,0,Math.PI/2.1),mat(0x26201a));
  hair.position.y=1.24;g.add(hair);
  const arms=[1,-1].map(s=>{
    const a=cy(.05,.05,.45,mat(shirt));a.position.set(.05,.85,s*.23);a.rotation.x=s*.4;g.add(a);return a;
  });
  g.userData.arms=arms;return g;
};
const waterSurf=(r,color=0x4fc3f7)=>{
  const geo=new THREE.CircleGeometry(r,36);
  const m=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,transparent:true,opacity:.85,roughness:.15,emissive:0x0a4a66,emissiveIntensity:.25}));
  m.rotation.x=-Math.PI/2;
  const pos=geo.attributes.position;
  m.userData.ripple=(t,amp=.06)=>{
    for(let i=0;i<pos.count;i++){
      const x=pos.getX(i),y=pos.getY(i),d=Math.sqrt(x*x+y*y);
      pos.setZ(i,Math.sin(d*2.2-t*2.4)*amp*(1-d/(r+.001)));
    }
    pos.needsUpdate=true;
  };
  return m;
};
const addTable=(scene,w=5,d=3,h=1.5)=>{
  const g=new THREE.Group();
  const top=bx(w,.18,d,mat(0xa9713d));top.position.y=h;g.add(top);
  [[-w/2+.3,d/2-.3],[w/2-.3,d/2-.3],[-w/2+.3,-d/2+.3],[w/2-.3,-d/2+.3]]
    .forEach(([x,z])=>{const l=cy(.08,.08,h,mat(0x7a4a22));l.position.set(x,h/2,z);g.add(l);});
  scene.add(g);return g;
};
const morpher=(mesh,amp=.12,speed=1.6)=>{
  const pos=mesh.geometry.attributes.position,base=pos.array.slice();
  return t=>{
    for(let i=0;i<pos.count;i++){
      const bx=base[i*3],by=base[i*3+1],bz=base[i*3+2];
      const n=1+amp*Math.sin(bx*3+t*speed)+amp*.8*Math.sin(by*4-t*speed*1.3)+amp*.6*Math.sin(bz*5+t*speed*.7);
      pos.setXYZ(i,bx*n,by*n,bz*n);
    }
    pos.needsUpdate=true;mesh.geometry.computeVertexNormals();
  };
};

/* ─── 14 real-scenario simulations ─── */
export const SIM_DEFS = {

  /* 1 - measurement */
  measurement:{
    cam:{radius:8.5,phi:1.15,theta:.45,target:[0,2,0]},
    controls:[{k:'a',label:'বাহুর দৈর্ঘ্য (a)',min:.5,max:2.2,step:.05,unit:'মি',def:1.2}],
    readouts:p=>[`বাহু a = ${B(p.a)} মি`,`আয়তন V = a³ = ${B(p.a**3)} ঘন মি`],
    setup(scene){
      sky(scene,[[0,'#ffe9c4'],[1,'#f5cf94']],'#f5cf94');
      ground(scene,12,'#c98e54','#8a5a2e');
      addTable(scene);
      const bd=bx(6,2.6,.15,mat(0x14532d));bd.position.set(0,3.2,-3.2);scene.add(bd);
      const fr=bx(6.3,2.9,.1,mat(0x8a5a2b));fr.position.set(0,3.2,-3.28);scene.add(fr);
      const gift=new THREE.Group();
      gift.add(bx(1,1,1,mat(0xff5d8f,0x7a1136,.3)));
      const rb=mat(0xffd23f,0x8a6d00,.4);
      gift.add(bx(1.04,1.04,.18,rb));gift.add(bx(.18,1.04,1.04,rb));
      const bow=sph(.16,rb);bow.position.y=.56;gift.add(bow);
      scene.add(gift);
      const ruler=bx(3.6,.05,.5,mat(0xffe08a));ruler.position.set(0,1.62,1.05);scene.add(ruler);
      for(let i=0;i<=8;i++){const t=bx(.025,.06,.22,bmat(0x5b3a00));t.position.set(-1.6+i*.4,1.65,.95);scene.add(t);}
      return(t,dt,p)=>{gift.scale.setScalar(p.a);gift.position.y=1.59+p.a/2;gift.rotation.y=Math.sin(t*.4)*.15;};
    },
  },

  /* 2 - motion */
  motion:{
    cam:{radius:13,phi:1.25,theta:0,target:[0,2,0]},
    controls:[
      {k:'u',label:'কিকের বেগ (u)',min:4,max:20,step:.5,unit:'মি/সে',def:12},
      {k:'angle',label:'কিকের কোণ (θ)',min:10,max:80,step:1,unit:'°',def:45},
    ],
    actions:[{label:'⚽ কিক করো!',k:'fire'}],
    readouts:p=>{const r=(p.angle*Math.PI)/180,g=9.8;return[`পাল্লা R = ${B((p.u*p.u*Math.sin(2*r))/g,1)} মি`,`সর্বোচ্চ H = ${B((p.u*Math.sin(r))**2/(2*g),1)} মি`];},
    setup(scene){
      sky(scene,[[0,'#7ec9ff'],[.55,'#bfe8ff'],[1,'#e8fff0']],'#cfeeff',20,55);
      ground(scene,16,'#5fbf63','#2f8f3e');
      addSun(scene);const cu=addClouds(scene,4);
      addTree(scene,-8,-5,1.2);addTree(scene,7.5,-6,1);
      for(let i=-5;i<=5;i+=2){const l=bx(.08,.02,6,mat(0xffffff));l.position.set(i,.02,0);scene.add(l);}
      const goal=new THREE.Group();
      const pm=mat(0xffffff,0xbbbbbb,.15);
      const p1=cy(.07,.07,2,pm);p1.position.set(0,1,-1.1);
      const p2=cy(.07,.07,2,pm);p2.position.set(0,1,1.1);
      const bar=cy(.07,.07,2.2,pm);bar.rotation.x=Math.PI/2;bar.position.y=2;
      goal.add(p1,p2,bar);scene.add(goal);
      const player=addPerson(0xe53935,0xffffff);scene.add(player);
      const ball=sph(.28,mat(0xffffff,0x888888,.1));
      for(let i=0;i<7;i++){const d=sph(.085,bmat(0x111111));d.position.setFromSphericalCoords(.27,Math.acos(2*Math.random()-1),Math.random()*Math.PI*2);ball.add(d);}
      scene.add(ball);
      const sh=new THREE.Mesh(new THREE.CircleGeometry(.3,18),new THREE.MeshBasicMaterial({color:0,transparent:true,opacity:.22}));
      sh.rotation.x=-Math.PI/2;sh.position.y=.03;scene.add(sh);
      const tGeo=new THREE.BufferGeometry();tGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(41*3),3));
      const trail=new THREE.Line(tGeo,new THREE.LineDashedMaterial({color:0xfff176,dashSize:.22,gapSize:.14,transparent:true,opacity:.9}));scene.add(trail);
      let tFly=0,flying=false,lastFire=0;const G=9.8,S=.45;
      return(t,dt,p)=>{
        cu(dt);
        const rad=(p.angle*Math.PI)/180,range=(p.u*p.u*Math.sin(2*rad))/G,x0=(-range/2)*S;
        player.position.set(x0-.45,0,0);player.rotation.y=Math.PI/2;
        goal.position.x=-x0;
        const pos=tGeo.attributes.position,T=(2*p.u*Math.sin(rad))/G;
        for(let i=0;i<=40;i++){const tt=(T*i)/40;pos.setXYZ(i,p.u*Math.cos(rad)*tt*S+x0,(p.u*Math.sin(rad)*tt-.5*G*tt*tt)*S+.3,0);}
        pos.needsUpdate=true;trail.computeLineDistances();
        if(p.fire!==lastFire){lastFire=p.fire;tFly=0;flying=true;}
        if(flying){tFly+=dt;const y=p.u*Math.sin(rad)*tFly-.5*G*tFly*tFly;if(y<0)flying=false;else{ball.position.set(p.u*Math.cos(rad)*tFly*S+x0,y*S+.3,0);ball.rotation.z-=dt*9;}}
        else ball.position.set(x0,.3,0);
        sh.position.x=ball.position.x;sh.scale.setScalar(Math.max(.4,1-ball.position.y*.12));
      };
    },
  },

  /* 3 - force */
  force:{
    cam:{radius:11,phi:1.2,theta:.12,target:[0,1,0]},
    controls:[
      {k:'F',label:'প্রযুক্ত বল (F)',min:0,max:40,step:1,unit:'N',def:12},
      {k:'m',label:'ভর (m)',min:1,max:12,step:.5,unit:'কেজি',def:4},
      {k:'mu',label:'ঘর্ষণ গুণাঙ্ক (μ)',min:0,max:.5,step:.05,unit:'',def:.1},
    ],
    readouts:p=>{const f=p.mu*p.m*9.8,a=Math.max(0,p.F-f)/p.m;return[`ঘর্ষণ বল = ${B(f,1)} N`,`ত্বরণ a = ${B(a,2)} মি/সে²`];},
    setup(scene){
      sky(scene,[[0,'#7ec9ff'],[.6,'#cfeeff'],[1,'#f0fff2']],'#cfeeff',20,55);
      ground(scene,16,'#6cc870','#338a42');
      addSun(scene);const cu=addClouds(scene,3);
      addTree(scene,-7,-4.5,1.1);addTree(scene,6,-5,1.3);
      const road=bx(18,.08,3,mat(0x3c4350));road.position.y=.05;scene.add(road);
      for(let i=-8;i<=8;i+=1.6){const s=bx(.7,.02,.12,mat(0xfff176));s.position.set(i,.1,0);scene.add(s);}
      const crate=new THREE.Group();
      crate.add(bx(1,1,1,mat(0xc98e54)));
      const x1=bx(1.3,.1,.04,mat(0x8a5a2e));x1.rotation.z=.78;x1.position.z=.51;crate.add(x1);
      const x2=bx(1.3,.1,.04,mat(0x8a5a2e));x2.rotation.z=-.78;x2.position.z=.51;crate.add(x2);
      const arr=arw(1,0xffd23f);crate.add(arr);
      const grp=new THREE.Group();grp.add(crate);scene.add(grp);
      const pusher=addPerson(0x1ec96b,0x37474f);grp.add(pusher);
      pusher.rotation.y=Math.PI/2;
      let v=0,x=-6,key='';
      return(t,dt,p)=>{
        cu(dt);
        const k=`${p.F}|${p.m}|${p.mu}`;
        if(k!==key){key=k;v=0;x=-6;}
        const a=Math.max(0,p.F-p.mu*p.m*9.8)/p.m;
        v+=a*dt;x+=v*dt*.6;if(x>7.5){x=-6;v=0;}
        const s=.6+p.m*.1;
        crate.scale.setScalar(s);crate.position.y=.1+s/2;
        pusher.position.set(-s/2-.55,.1,0);
        arr.position.set(-.62,0,0);arr.rotation.y=Math.PI;
        arr.userData.setLen((.05*p.F+.15)/s);
        grp.position.x=x;
      };
    },
  },

  /* 4 - energy */
  energy:{
    cam:{radius:10.5,phi:1.3,theta:.1,target:[1.4,1.6,0]},
    controls:[
      {k:'L',label:'দোলনার দড়ি (L)',min:1.5,max:2.8,step:.1,unit:'মি',def:2.3},
      {k:'amp',label:'দোলনের কোণ',min:10,max:65,step:1,unit:'°',def:45},
    ],
    readouts:p=>[`দড়ি L = ${B(p.L,1)} মি`,`পর্যায়কাল T ≈ ${B(2*Math.PI*Math.sqrt(p.L/9.8),2)} সে`],
    setup(scene){
      sky(scene,[[0,'#86d0ff'],[.6,'#d4f0ff'],[1,'#f4fff0']],'#d4f0ff',20,55);
      ground(scene,15,'#69c66e','#2f8f3e');
      addSun(scene);const cu=addClouds(scene,3);
      addTree(scene,-6.5,-4,1.3);addTree(scene,5,-6,1);
      const fm=mat(0xff8f00,0xa85b00,.2);
      [-.1,.1].forEach(z=>[-1,1].map(tilt=>{const leg=cy(.09,.09,3.8,fm);leg.position.set(tilt*.8,1.7,z*1.1);leg.rotation.z=tilt*.42;scene.add(leg);}));
      const bar=cy(.09,.09,2.6,fm);bar.rotation.x=Math.PI/2;bar.position.y=3.35;scene.add(bar);
      const swing=new THREE.Group();swing.position.y=3.35;scene.add(swing);
      const ropes=[-.3,.3].map(z=>{const r=cy(.025,.025,1,mat(0xdddddd));r.position.z=z;swing.add(r);return r;});
      const seat=bx(.9,.08,.45,mat(0xd32f2f));swing.add(seat);
      const kid=new THREE.Group();swing.add(kid);
      const kb=cy(.13,.16,.45,mat(0x1ec96b));kb.position.y=.32;kid.add(kb);
      const kh=sph(.14,mat(0xffcf9f));kh.position.y=.68;kid.add(kh);
      [-.12,.12].forEach(z=>{const lg=cy(.05,.05,.45,mat(0x3949ab));lg.rotation.x=1.35;lg.position.set(.26,.12,z);kid.add(lg);});
      const pe=bx(.6,1,.6,mat(0x42a5f5,0x0d47a1,.5));pe.position.x=4.2;scene.add(pe);
      const ke=bx(.6,1,.6,mat(0xffa726,0xb35a00,.5));ke.position.x=5.5;scene.add(ke);
      const peC=sph(.34,mat(0x42a5f5,0x0d47a1,.7));scene.add(peC);
      const keC=sph(.34,mat(0xffa726,0xb35a00,.7));scene.add(keC);
      return(t,dt,p)=>{
        cu(dt);
        const a0=(p.amp*Math.PI)/180,w=Math.sqrt(9.8/p.L),th=a0*Math.cos(t*w);
        swing.rotation.z=th;
        ropes.forEach(r=>{r.scale.y=p.L;r.position.y=-p.L/2;});
        seat.position.y=-p.L;kid.position.y=-p.L+.05;
        const peF=(1-Math.cos(th))/(1-Math.cos(a0)||1e-6),keF=1-peF;
        pe.scale.y=Math.max(.04,peF)*2.6;pe.position.y=pe.scale.y/2;
        ke.scale.y=Math.max(.04,keF)*2.6;ke.position.y=ke.scale.y/2;
        peC.position.set(4.2,pe.scale.y+.25,0);keC.position.set(5.5,ke.scale.y+.25,0);
      };
    },
  },

  /* 5 - pressure */
  pressure:{
    cam:{radius:9.5,phi:1.1,theta:.5,target:[0,.6,0]},
    controls:[
      {k:'rho',label:'বস্তুর ঘনত্ব (ρ)',min:200,max:2000,step:50,unit:'কেজি/মি³',def:700},
      {k:'depth',label:'প্রোবের গভীরতা (h)',min:.2,max:2.4,step:.1,unit:'মি',def:1.2},
    ],
    readouts:p=>[p.rho<1000?'⛵ ভাসছে! (ρ < ১০০০)':'🪨 ডুবছে! (ρ > ১০০০)',`চাপ ≈ ${B((p.depth*1000*9.8)/1000,1)} kPa`],
    setup(scene){
      sky(scene,[[0,'#7ec9ff'],[.6,'#cdeeff'],[1,'#effff2']],'#cdeeff',20,55);
      ground(scene,15,'#6cc870','#2f8f3e');
      addSun(scene);const cu=addClouds(scene,3);
      addTree(scene,-6,-4,1.2);addTree(scene,6.2,-3.5,1);
      const rim=new THREE.Mesh(new THREE.TorusGeometry(3,.32,12,40),mat(0x9a6b3d));
      rim.rotation.x=Math.PI/2;rim.position.y=.15;scene.add(rim);
      const water=cy(2.95,2.95,1.6,new THREE.MeshStandardMaterial({color:0x2196f3,transparent:true,opacity:.55,roughness:.1}),36);
      water.position.y=-.65;scene.add(water);
      const surf=waterSurf(2.95);surf.position.y=.16;scene.add(surf);
      const lily=new THREE.Mesh(new THREE.CircleGeometry(.42,16,.4,5.6),mat(0x2e7d32,0x14532d,.3));
      lily.rotation.x=-Math.PI/2;lily.position.set(-1.7,.2,.8);scene.add(lily);
      const fishes=[0xff7043,0xffca28,0xef5350].map((c,i)=>{
        const f=new THREE.Group();
        const bd=sph(.14,mat(c,c,.4));bd.scale.set(1.5,1,1);f.add(bd);
        const tl=new THREE.Mesh(new THREE.ConeGeometry(.1,.2,8),mat(c,c,.4));tl.rotation.z=Math.PI/2;tl.position.x=-.25;f.add(tl);
        f.userData={r:1.2+i*.5,sp:.7+i*.25,ph:i*2.1,y:-.4-i*.25};scene.add(f);return f;
      });
      const boat=new THREE.Group();
      const hull=sph(.55,mat(0x8a5a2e));hull.scale.set(1.5,.45,.7);boat.add(hull);
      const mast=cy(.03,.03,.9,mat(0x6b4423));mast.position.y=.5;boat.add(mast);
      const sail=new THREE.Mesh(new THREE.PlaneGeometry(.7,.6),new THREE.MeshStandardMaterial({color:0xfff3e0,side:THREE.DoubleSide}));
      sail.position.set(.18,.62,0);boat.add(sail);scene.add(boat);
      const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.45),mat(0x78909c));scene.add(rock);
      const probe=cy(.045,.045,1.3,mat(0xff5252,0x7a0f0f,.7));
      probe.rotation.z=Math.PI/2;probe.position.x=2.2;scene.add(probe);
      return(t,dt,p)=>{
        cu(dt);surf.userData.ripple(t);
        const floats=p.rho<1000;
        boat.visible=floats;rock.visible=!floats;
        if(floats){
          const tgt=.32-(p.rho/1000)*.22;boat.position.y+=(tgt-boat.position.y)*.05;
          boat.position.y+=Math.sin(t*1.8)*.004;boat.rotation.z=Math.sin(t*1.4)*.06;
        } else {rock.position.y+=(-1.15-rock.position.y)*.04;rock.rotation.x+=dt*.4;}
        fishes.forEach(f=>{
          const a=t*f.userData.sp+f.userData.ph;
          f.position.set(Math.cos(a)*f.userData.r,f.userData.y+Math.sin(t*2+f.userData.ph)*.08,Math.sin(a)*f.userData.r);
          f.rotation.y=-a+Math.PI/2;
        });
        probe.position.y=.16-p.depth;
      };
    },
  },

  /* 6 - heat */
  heat:{
    cam:{radius:9,phi:1.2,theta:.1,target:[0,1.3,0]},
    controls:[{k:'T',label:'তাপমাত্রা (θ)',min:25,max:500,step:5,unit:'°C',def:25}],
    readouts:p=>[`তাপমাত্রা = ${B(p.T,0)} °C`,`প্রসারণ ΔL ≈ ${B(Math.max(0,4*.000023*(p.T-25)*1000),2)} মিমি`],
    setup(scene){
      sky(scene,[[0,'#3a2a22'],[.6,'#5a3a28'],[1,'#7a4a30']],'#5a3a28',14,38);
      ground(scene,12,'#6b4a35','#3e2a1d');
      const stove=cy(1.5,1.7,.55,mat(0x37322e));stove.position.y=.28;scene.add(stove);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.9,.07,10,30),mat(0x222222));
      ring.rotation.x=Math.PI/2;ring.position.y=.58;scene.add(ring);
      const flames=[];
      for(let i=0;i<6;i++){
        const fo=new THREE.Mesh(new THREE.ConeGeometry(.2,.7,10),new THREE.MeshBasicMaterial({color:0xff7b1a,transparent:true,opacity:.85}));
        const fi=new THREE.Mesh(new THREE.ConeGeometry(.1,.45,8),new THREE.MeshBasicMaterial({color:0xffe27d,transparent:true,opacity:.95}));
        const g=new THREE.Group();g.add(fo,fi);
        const a=(i/6)*Math.PI*2;g.position.set(Math.cos(a)*.55,.85,Math.sin(a)*.55);
        g.userData.ph=i*1.3;scene.add(g);flames.push(g);
      }
      const fireLight=new THREE.PointLight(0xff8c3a,0,12);fireLight.position.y=1.2;scene.add(fireLight);
      const L0=4;
      [-L0/2,L0/2].forEach(x=>{
        [.2,.62,1.04].forEach(y=>{const b=bx(.5,.4,.7,mat(y===.62?0xc96a4a:0xb5563a));b.position.set(x,y,0);scene.add(b);});
      });
      const rod=cy(.16,.16,1,mat(0x9aa3ad,0,0),22);rod.rotation.z=Math.PI/2;rod.position.y=1.4;scene.add(rod);
      const steam=[];
      for(let i=0;i<8;i++){const s=sph(.12,new THREE.MeshBasicMaterial({color:0xdddddd,transparent:true,opacity:0}));s.userData.ph=i/8;scene.add(s);steam.push(s);}
      const c1=new THREE.Color(0x9aa3ad),c2=new THREE.Color(0xff3b1f),c=new THREE.Color();
      return(t,dt,p)=>{
        const heat=(p.T-25)/475,visL=L0+(p.T-25)*.012;
        rod.scale.y=visL;rod.position.x=(visL-L0)/2;
        c.lerpColors(c1,c2,Math.max(0,heat));
        rod.material.color.copy(c);rod.material.emissive.copy(c);rod.material.emissiveIntensity=heat*1.5;
        fireLight.intensity=.15+heat*1.1;
        flames.forEach((f,i)=>{
          f.visible=p.T>50;
          const w=.55+heat*.9+.25*Math.sin(t*9+f.userData.ph);
          f.scale.set(.8+.2*Math.sin(t*12+i),w,.8+.2*Math.cos(t*11+i));
          f.rotation.y=Math.sin(t*4+i)*.3;
        });
        steam.forEach(s=>{
          if(heat<.4){s.material.opacity=0;return;}
          const ph=((t*.3+s.userData.ph)%1);
          s.position.set(Math.sin(ph*9+s.userData.ph*20)*.3+(s.userData.ph-.5)*2.5,1.7+ph*2.2,0);
          s.material.opacity=(1-ph)*.4*heat;s.scale.setScalar(.7+ph*1.6);
        });
      };
    },
  },

  /* 7 - wave */
  wave:{
    cam:{radius:12.5,phi:1.25,theta:0,target:[0,1.6,0]},
    controls:[
      {k:'f',label:'কম্পাঙ্ক (f)',min:.4,max:2.5,step:.1,unit:'Hz',def:1},
      {k:'amp',label:'বিস্তার (A)',min:.2,max:1.3,step:.05,unit:'মি',def:.8},
    ],
    readouts:p=>[`f = ${B(p.f,1)} Hz`,`λ = v/f = ${B(3/p.f,2)} মি`,`v = fλ = ৩ মি/সে`],
    setup(scene){
      sky(scene,[[0,'#241a4d'],[.5,'#6c3a8e'],[1,'#ff9d6b']],'#6c3a8e',16,45);
      ground(scene,15,'#3a5a3e','#1b2e20');
      [[-6.4,0],[6.4,0]].forEach(([x])=>{
        const pole=cy(.1,.13,3.2,mat(0x8a5a2e));pole.position.set(x,1.6,0);scene.add(pole);
        const base=cy(.3,.36,.2,mat(0x6b4423));base.position.set(x,.1,0);scene.add(base);
      });
      const spk=new THREE.Group();spk.position.set(-6.4,1.9,.8);scene.add(spk);
      spk.add(bx(.7,.9,.55,mat(0x263238)));
      const cone=cy(.26,.1,.18,mat(0x546e7a,0x222,.2));cone.rotation.x=Math.PI/2;cone.position.z=.32;spk.add(cone);
      const rings=[0,1,2].map(()=>{
        const r=new THREE.Mesh(new THREE.TorusGeometry(.3,.02,8,30),new THREE.MeshBasicMaterial({color:0xffd23f,transparent:true,opacity:0}));
        r.position.copy(spk.position);r.position.z+=.4;scene.add(r);return r;
      });
      const N=52,balls=[];
      for(let i=0;i<N;i++){
        const h=280-i*2.4;
        const b=sph(.13,mat(new THREE.Color(`hsl(${h},92%,66%)`),new THREE.Color(`hsl(${h},92%,40%)`)),.85);
        b.position.x=(i/(N-1))*12-6;scene.add(b);balls.push(b);
      }
      const sGeo=new THREE.BufferGeometry(),sp=new Float32Array(200*3);
      for(let i=0;i<200;i++){sp[i*3]=(Math.random()-.5)*40;sp[i*3+1]=4+Math.random()*12;sp[i*3+2]=-8-Math.random()*14;}
      sGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
      scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({color:0xffe8c8,size:.08})));
      return(t,dt,p)=>{
        balls.forEach((b,i)=>{const x=(i/(N-1))*12-6;b.position.y=1.9+p.amp*Math.sin(2*Math.PI*p.f*(t-(x+6)/3));});
        rings.forEach((r,i)=>{const ph=((t*p.f*.8+i/3)%1);r.scale.setScalar(.4+ph*3.2);r.material.opacity=(1-ph)*.6;});
      };
    },
  },

  /* 8 - reflection */
  reflection:{
    cam:{radius:10,phi:1.25,theta:0,target:[0,1.8,0]},
    controls:[{k:'i',label:'আপতন কোণ (i)',min:5,max:80,step:1,unit:'°',def:40}],
    readouts:p=>[`আপতন কোণ i = ${B(p.i,0)}°`,`প্রতিফলন কোণ r = ${B(p.i,0)}° (i = r)`],
    setup(scene){
      sky(scene,[[0,'#1d2a3a'],[1,'#0e1622']],'#16202e',14,40);
      ground(scene,12,'#7a5230','#4a3018');
      const mirror=bx(7,.14,2.6,new THREE.MeshStandardMaterial({color:0xd8ecff,metalness:1,roughness:.05}));
      mirror.position.y=.12;scene.add(mirror);
      const gm=mat(0xd4a017,0x7a5a00,.5);
      [[0,1.45],[0,-1.45]].forEach(([x,z])=>{const f=bx(7.4,.2,.2,gm);f.position.set(x,.12,z);scene.add(f);});
      [[-3.6,0],[3.6,0]].forEach(([x])=>{const f=bx(.2,.2,3.1,gm);f.position.set(x,.12,0);scene.add(f);});
      scene.add(seg([[0,.2,0],[0,4.6,0]],0x8fc8a8,true));
      const mkBuf=()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));return g;};
      const giB=mkBuf(),grB=mkBuf();
      scene.add(new THREE.Line(giB,new THREE.LineBasicMaterial({color:0xffd23f})));
      scene.add(new THREE.Line(grB,new THREE.LineBasicMaterial({color:0x3ee88a})));
      const torch=new THREE.Group();scene.add(torch);
      const tb=cy(.12,.14,.7,mat(0x37474f));tb.rotation.z=Math.PI/2;torch.add(tb);
      const tg=sph(.13,bmat(0xfff3b0));tg.position.x=.5;torch.add(tg);
      const tL=new THREE.PointLight(0xffe8a0,.6,10);torch.add(tL);
      const photon=sph(.11,bmat(0xfff176));scene.add(photon);
      const pG=new THREE.PointLight(0xfff176,.5,5);scene.add(pG);
      return(t,dt,p)=>{
        const r=(p.i*Math.PI)/180,L=4;
        const sx=-Math.sin(r)*L,sy=Math.cos(r)*L+.12;
        giB.attributes.position.setXYZ(0,sx,sy,0);giB.attributes.position.setXYZ(1,0,.12,0);
        grB.attributes.position.setXYZ(0,0,.12,0);grB.attributes.position.setXYZ(1,-sx,sy,0);
        giB.attributes.position.needsUpdate=grB.attributes.position.needsUpdate=true;
        torch.position.set(sx,sy,0);torch.rotation.z=Math.atan2(.12-sy,0-sx);
        const u=(t*.7)%2;
        if(u<1)photon.position.set(sx*(1-u),sy*(1-u)+.12*u,0);
        else photon.position.set(-sx*(u-1),.12+(sy-.12)*(u-1),0);
        pG.position.copy(photon.position);
      };
    },
  },

  /* 9 - refraction */
  refraction:{
    cam:{radius:8.5,phi:1.35,theta:.15,target:[0,2.3,0]},
    controls:[
      {k:'i',label:'আপতন কোণ (i)',min:5,max:70,step:1,unit:'°',def:40},
      {k:'n',label:'প্রতিসরণাঙ্ক (n)',min:1.2,max:2.4,step:.05,unit:'',def:1.33},
    ],
    readouts:p=>{const r=Math.asin(Math.min(1,Math.sin((p.i*Math.PI)/180)/p.n));return[`i = ${B(p.i,0)}°`,`r = ${B((r*180)/Math.PI,1)}°`,`মাধ্যম: ${p.n<1.4?'পানি':'কাচ'} (n = ${B(p.n,2)})`];},
    setup(scene){
      sky(scene,[[0,'#ffeccd'],[1,'#f2c98e']],'#f2c98e',14,40);
      ground(scene,12,'#c98e54','#8a5a2e');
      addTable(scene,6,4,1.4);
      const glass=cy(1.15,1,2.3,new THREE.MeshPhysicalMaterial({color:0xeaf6ff,transparent:true,opacity:.22,roughness:.05}),28);
      glass.position.y=2.65;scene.add(glass);
      const water=cy(1.05,.95,1.5,new THREE.MeshStandardMaterial({color:0x4fc3f7,transparent:true,opacity:.5,roughness:.1}),28);
      water.position.y=2.3;scene.add(water);
      const surf=waterSurf(1.05,0x7fd8ff);surf.position.y=3.06;scene.add(surf);
      const up=cy(.07,.07,1.9,mat(0xffc107),10);
      const tip=new THREE.Mesh(new THREE.ConeGeometry(.07,.18,10),mat(0xff80ab));
      const down=cy(.065,.05,1.3,mat(0xffa000),10);
      scene.add(up,tip,down);
      const mkBuf=()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));return g;};
      const giB=mkBuf(),grB=mkBuf();
      scene.add(new THREE.Line(giB,new THREE.LineBasicMaterial({color:0xffd23f,transparent:true,opacity:.85})));
      scene.add(new THREE.Line(grB,new THREE.LineBasicMaterial({color:0x3ee88a,transparent:true,opacity:.85})));
      const photon=sph(.08,bmat(0xfff176));scene.add(photon);
      const ySurf=3.06;
      return(t,dt,p)=>{
        surf.userData.ripple(t,.025);
        const ri=(p.i*Math.PI)/180,rr=Math.asin(Math.min(1,Math.sin(ri)/p.n));
        const uL=1.9,dL=1.3;
        up.position.set(Math.sin(ri)*uL*.5,ySurf+Math.cos(ri)*uL*.5,0);up.rotation.z=-ri;
        tip.position.set(Math.sin(ri)*uL,ySurf+Math.cos(ri)*uL,0);tip.rotation.z=-ri;
        down.position.set(-Math.sin(rr)*dL*.5,ySurf-Math.cos(rr)*dL*.5,0);down.rotation.z=rr;
        const L=2.2;
        giB.attributes.position.setXYZ(0,Math.sin(ri)*L,ySurf+Math.cos(ri)*L,.4);giB.attributes.position.setXYZ(1,0,ySurf,.4);
        grB.attributes.position.setXYZ(0,0,ySurf,.4);grB.attributes.position.setXYZ(1,-Math.sin(rr)*1.4,ySurf-Math.cos(rr)*1.4,.4);
        giB.attributes.position.needsUpdate=grB.attributes.position.needsUpdate=true;
        const u=(t*.8)%2;
        if(u<1)photon.position.set(Math.sin(ri)*L*(1-u),ySurf+Math.cos(ri)*L*(1-u),.4);
        else photon.position.set(-Math.sin(rr)*1.4*(u-1),ySurf-Math.cos(rr)*1.4*(u-1),.4);
      };
    },
  },

  /* 10 - static */
  static:{
    cam:{radius:9,phi:1.2,theta:0,target:[0,1.6,0]},
    controls:[
      {k:'q1',label:'বেলুন-১ এর আধান q₁',min:-5,max:5,step:1,unit:'μC',def:3},
      {k:'q2',label:'বেলুন-২ এর আধান q₂',min:-5,max:5,step:1,unit:'μC',def:-3},
      {k:'d',label:'দূরত্ব (d)',min:1.8,max:6,step:.1,unit:'মি',def:3},
    ],
    readouts:p=>[p.q1*p.q2===0?'⚪ বল নেই':p.q1*p.q2<0?'🧲 আকর্ষণ (বিপরীত আধান)':'↔️ বিকর্ষণ (সমধর্মী আধান)',`বল F ∝ ${B((9*Math.abs(p.q1*p.q2))/(p.d*p.d),1)} একক`],
    setup(scene){
      sky(scene,[[0,'#fdebd2'],[1,'#f5cf9e']],'#f5cf9e',14,40);
      ground(scene,12,'#caa470','#8f6a3e');
      addTable(scene,8,4,1.2);
      const mkBalloon=()=>{
        const g=new THREE.Group();
        const bd=sph(.5,mat(0xff6b6b,0xa01616,.7));bd.scale.y=1.2;g.add(bd);
        const knot=new THREE.Mesh(new THREE.ConeGeometry(.09,.16,8),bd.material);knot.position.y=-.65;knot.rotation.x=Math.PI;g.add(knot);
        g.userData.body=bd;return g;
      };
      const b1=mkBalloon(),b2=mkBalloon();scene.add(b1,b2);
      const mkBuf=()=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3));return g;};
      const s1=mkBuf(),s2=mkBuf();
      scene.add(new THREE.Line(s1,new THREE.LineBasicMaterial({color:0xdddddd})));
      scene.add(new THREE.Line(s2,new THREE.LineBasicMaterial({color:0xdddddd})));
      const fa=arw(1,0xffd23f),fb=arw(1,0xffd23f);scene.add(fa,fb);
      const papers=[];
      for(let i=0;i<12;i++){
        const pp=bx(.14,.015,.1,mat(0xffffff));
        pp.position.set((Math.random()-.5)*3,1.31,(Math.random()-.5)*1.6);
        pp.rotation.y=Math.random()*3;pp.userData={ph:Math.random()*6};
        scene.add(pp);papers.push(pp);
      }
      const Y=2.6;
      return(t,dt,p)=>{
        const attract=p.q1*p.q2<0,F=(9*Math.abs(p.q1*p.q2))/(p.d*p.d);
        const wob=Math.sin(t*3)*.07*(attract?1:-1);
        const x1=-p.d/2+wob,x2=p.d/2-wob;
        b1.position.set(x1,Y+Math.sin(t*1.6)*.06,0);b2.position.set(x2,Y+Math.cos(t*1.5)*.06,0);
        const set=(g,q)=>{const c=q>=0?0xff5252:0x42a5f5,e=q>=0?0xa01616:0x0d47a1;g.userData.body.material.color.set(c);g.userData.body.material.emissive.set(e);g.scale.setScalar(.8+Math.abs(q)*.1);};
        set(b1,p.q1);set(b2,p.q2);
        s1.attributes.position.setXYZ(0,x1,Y-.75,0);s1.attributes.position.setXYZ(1,x1*.85,1.31,0);
        s2.attributes.position.setXYZ(0,x2,Y-.75,0);s2.attributes.position.setXYZ(1,x2*.85,1.31,0);
        s1.attributes.position.needsUpdate=s2.attributes.position.needsUpdate=true;
        const len=Math.min(1.6,F*.18+.3),show=p.q1!==0&&p.q2!==0;
        fa.visible=fb.visible=show;
        fa.position.set(x1,Y,0);fa.rotation.y=attract?0:Math.PI;
        fb.position.set(x2,Y,0);fb.rotation.y=attract?Math.PI:0;
        fa.userData.setLen(len);fb.userData.setLen(len);
        const pull=Math.min(1,(Math.abs(p.q1)+Math.abs(p.q2))/8);
        papers.forEach(pp=>{pp.position.y=1.31+Math.max(0,Math.sin(t*5+pp.userData.ph))*.5*pull;pp.rotation.x=Math.sin(t*4+pp.userData.ph)*.6*pull;});
      };
    },
  },

  /* 11 - circuit */
  circuit:{
    cam:{radius:10,phi:1.25,theta:.1,target:[0,2,0]},
    controls:[
      {k:'V',label:'ভোল্টেজ (V)',min:1,max:12,step:.5,unit:'V',def:6},
      {k:'R',label:'রোধ (R)',min:1,max:12,step:.5,unit:'Ω',def:4},
    ],
    readouts:p=>[`প্রবাহ I = V/R = ${B(p.V/p.R,2)} A`,`ক্ষমতা P = VI = ${B(p.V*(p.V/p.R),1)} W`],
    setup(scene){
      sky(scene,[[0,'#0b2530'],[1,'#143842']],'#103038',14,40);
      ground(scene,12,'#7a5230','#42301c');
      const wall=bx(14,7,.15,mat(0x1d4a55,0x2a6a78,0));wall.position.set(0,3.5,-3);scene.add(wall);
      const W=5,H=3,peri=2*(W+H),baseY=1.2;
      scene.add(seg([[-W/2,baseY,0],[W/2,baseY,0],[W/2,baseY+H,0],[-W/2,baseY+H,0],[-W/2,baseY,0]],0x9adbb4));
      addTable(scene,3,1.6,1);
      const bat=cy(.3,.3,1.1,mat(0x1ec96b,0x0a5a2e,.4),18);bat.rotation.z=Math.PI/2;bat.position.y=baseY;scene.add(bat);
      const cord=cy(.025,.025,1.4,mat(0x222222));cord.position.set(0,baseY+H+.7,0);scene.add(cord);
      const shade=new THREE.Mesh(new THREE.ConeGeometry(.65,.55,20,1,true),new THREE.MeshStandardMaterial({color:0xff8f00,side:THREE.DoubleSide}));
      shade.position.set(0,baseY+H+.25,0);scene.add(shade);
      const bulb=sph(.36,mat(0xfff4c2,0xffca28,0));bulb.position.set(0,baseY+H-.1,0);scene.add(bulb);
      const glow=new THREE.PointLight(0xffd76e,0,12);glow.position.copy(bulb.position);scene.add(glow);
      const res=bx(.32,1,.32,mat(0xd7a06a));res.position.set(W/2,baseY+H/2,0);scene.add(res);
      [0xff5252,0x42a5f5,0xffd23f].forEach((c,i)=>{
        const band=new THREE.Mesh(new THREE.TorusGeometry(.22,.045,8,18),mat(c));
        band.position.set(W/2,baseY+H/2-.25+i*.25,0);scene.add(band);
      });
      const N=24,els=[];
      for(let i=0;i<N;i++){const e=sph(.075,bmat(0x6ef5a3));scene.add(e);els.push(e);}
      const posAt=s=>{
        s=((s%peri)+peri)%peri;
        if(s<W)return[s-W/2,0];if(s<W+H)return[W/2,s-W];
        if(s<2*W+H)return[W/2-(s-W-H),H];return[-W/2,H-(s-2*W-H)];
      };
      return(t,dt,p)=>{
        const I=p.V/p.R,br=Math.min(1,I/3);
        bulb.material.emissiveIntensity=br*2.6;glow.intensity=br*1.5;
        wall.material.emissiveIntensity=br*.55;
        els.forEach((e,i)=>{const [x,y]=posAt((i/N)*peri+t*I*.9);e.position.set(x,y+baseY,0);});
      };
    },
  },

  /* 12 - magnet */
  magnet:{
    cam:{radius:10.5,phi:1.15,theta:.5,target:[0,1.8,0]},
    controls:[{k:'I',label:'তড়িৎ প্রবাহ (I)',min:0,max:5,step:.1,unit:'A',def:2}],
    actions:[{label:'🔁 প্রবাহের দিক উল্টাও',k:'flip'}],
    readouts:p=>[`প্রবাহ I = ${B(p.I,1)} A — ${Math.min(10,Math.floor(p.I*2.2))}টি পেরেক উঠেছে!`,`দিক: ${p.flip%2===0?'সম্মুখ (+)':'বিপরীত (−)'}`],
    setup(scene){
      sky(scene,[[0,'#9fb8c8'],[.6,'#cfdde6'],[1,'#e8eef0']],'#cfdde6',18,50);
      ground(scene,14,'#9aa3ab','#5f6a72');
      const cm=mat(0xffb300,0x7a5200,.25);
      const base=bx(1.6,.5,1.6,cm);base.position.set(-3.4,.25,0);scene.add(base);
      const mast=cy(.14,.18,4.4,cm);mast.position.set(-3.4,2.4,0);scene.add(mast);
      const arm=cy(.11,.11,4.2,cm);arm.rotation.z=Math.PI/2;arm.position.set(-1.4,4.5,0);scene.add(arm);
      const cable=cy(.03,.03,2.2,mat(0x333333));cable.position.set(.6,3.4,0);scene.add(cable);
      const pts=[];
      for(let a=0;a<=Math.PI*12;a+=.16)pts.push(new THREE.Vector3(Math.cos(a)*.55,2.3-(a/(Math.PI*12))*.9,Math.sin(a)*.55));
      const coil=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),240,.05,8,false),new THREE.MeshStandardMaterial({color:0xe8923a,metalness:.85,roughness:.3}));
      coil.position.x=.6;scene.add(coil);
      const core=cy(.32,.32,1.1,mat(0x546e7a));core.position.set(.6,1.85,0);scene.add(core);
      const rings=[.9,1.3,1.7].map(r=>{
        const m=new THREE.Mesh(new THREE.TorusGeometry(r,.018,8,40),new THREE.MeshBasicMaterial({color:0x42a5f5,transparent:true,opacity:.3}));
        m.rotation.x=Math.PI/2;m.position.set(.6,1.85,0);scene.add(m);return m;
      });
      const nails=[];
      for(let i=0;i<10;i++){
        const n=cy(.035,.05,.55,mat(0x90a4ae,0x333,.2),8);
        const a=Math.random()*Math.PI*2,r=.6+Math.random()*1.6;
        n.userData.rest=new THREE.Vector3(.6+Math.cos(a)*r,.06,Math.sin(a)*r);
        n.userData.restRot=[Math.PI/2+(Math.random()-.5)*.4,Math.random()*3,0];
        n.position.copy(n.userData.rest);n.rotation.set(...n.userData.restRot);
        const hang=(i/10)*Math.PI*2;
        n.userData.hang=new THREE.Vector3(.6+Math.cos(hang)*.3,1.05-(i%3)*.18,Math.sin(hang)*.3);
        scene.add(n);nails.push(n);
      }
      const comp=new THREE.Group();comp.position.set(-1.6,.35,2);scene.add(comp);
      comp.add(cy(.55,.55,.1,mat(0x1d2a4a),28));
      const needle=new THREE.Group();comp.add(needle);
      const nR=new THREE.Mesh(new THREE.ConeGeometry(.08,.45,10),bmat(0xff5252));nR.rotation.z=-Math.PI/2;nR.position.set(.22,.09,0);needle.add(nR);
      const nW=new THREE.Mesh(new THREE.ConeGeometry(.08,.45,10),bmat(0xeeeeee));nW.rotation.z=Math.PI/2;nW.position.set(-.22,.09,0);needle.add(nW);
      return(t,dt,p)=>{
        const dir=p.flip%2===0?1:-1,target=dir*Math.min(1.35,p.I*.45);
        needle.rotation.y+=(target-needle.rotation.y)*.05;
        rings.forEach((r,i)=>{const s=1+.07*Math.sin(t*3-i);r.scale.setScalar(s);r.material.opacity=Math.min(.7,.06+p.I*.13);});
        const k=Math.min(10,Math.floor(p.I*2.2));
        nails.forEach((n,i)=>{
          const up=i<k,tgt=up?n.userData.hang:n.userData.rest;
          n.position.lerp(tgt,.07);
          if(up){n.rotation.x+=(0-n.rotation.x)*.08;n.position.x+=Math.sin(t*3+i)*.003;}
          else n.rotation.x+=(n.userData.restRot[0]-n.rotation.x)*.08;
        });
      };
    },
  },

  /* 13 - atom */
  atom:{
    cam:{radius:8,phi:1.15,theta:.4,target:[0,.4,0]},
    controls:[
      {k:'ne',label:'ইলেকট্রন সংখ্যা',min:1,max:10,step:1,unit:'',def:6},
      {k:'speed',label:'ঘূর্ণনের গতি',min:.2,max:3,step:.1,unit:'×',def:1},
    ],
    readouts:p=>[`ইলেকট্রন = ${bn(p.ne)} টি`,'কেন্দ্রে: প্রোটন (লাল) + নিউট্রন (সাদা)'],
    setup(scene){
      sky(scene,[[0,'#1a0a33'],[.6,'#2a0f44'],[1,'#0a0520']],'#1a0a33',16,45);
      const ng=new THREE.BufferGeometry(),np=new Float32Array(400*3),nc=new Float32Array(400*3);
      for(let i=0;i<400;i++){np[i*3]=(Math.random()-.5)*40;np[i*3+1]=(Math.random()-.5)*26;np[i*3+2]=(Math.random()-.5)*40;const col=new THREE.Color(`hsl(${Math.random()*360},85%,70%)`);nc[i*3]=col.r;nc[i*3+1]=col.g;nc[i*3+2]=col.b;}
      ng.setAttribute('position',new THREE.BufferAttribute(np,3));ng.setAttribute('color',new THREE.BufferAttribute(nc,3));
      scene.add(new THREE.Points(ng,new THREE.PointsMaterial({size:.09,vertexColors:true})));
      for(let i=0;i<8;i++){const n=sph(.2,mat(i%2?0xff6b6b:0xe8eefc,i%2?0xa01616:0x3a4f78,.8));n.position.set(Math.sin(i*2.1)*.22,.4+Math.cos(i*1.7)*.22,Math.sin(i*3.3)*.22);scene.add(n);}
      const aura=sph(.62,new THREE.MeshBasicMaterial({color:0xff9d5c,transparent:true,opacity:.18}));aura.position.y=.4;scene.add(aura);
      const auraMorph=morpher(aura,.2,2.2);
      [[1.2,0xe98df5],[2.2,0x4de3ff]].forEach(([r,c],i)=>{
        const o=new THREE.Mesh(new THREE.TorusGeometry(r,.014,8,80),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.4}));
        o.rotation.set(Math.PI/2.4,i,0);o.position.y=.4;scene.add(o);
      });
      const els=[],trails=[];
      for(let i=0;i<10;i++){
        const e=sph(.12,mat(0x4de3ff,0x4de3ff,1.8));scene.add(e);els.push(e);
        const tr=[0,1,2].map(k=>{const g=sph(.07-k*.018,new THREE.MeshBasicMaterial({color:0x4de3ff,transparent:true,opacity:.5-k*.15}));scene.add(g);return g;});
        trails.push(tr);
      }
      const rays=[0xffd23f,0x5dffb0,0xff8df0].map(c=>{const r=sph(.07,new THREE.MeshBasicMaterial({color:c,transparent:true}));scene.add(r);return r;});
      const dirs=[[1,.4,.2],[-.7,.6,-.5],[.2,-.8,.8]],hist=els.map(()=>[]);
      return(t,dt,p)=>{
        auraMorph(t);
        const T=t*p.speed;
        els.forEach((e,i)=>{
          const on=i<p.ne;e.visible=on;trails[i].forEach(g=>g.visible=on);
          if(!on)return;
          const shell=i<2?1.2:2.2,k=i<2?i/2:(i-2)/8,a=T*(i<2?2:1.2)+k*Math.PI*2,tilt=i%3===0?.5:i%3===1?-.6:1.1;
          e.position.set(Math.cos(a)*shell,.4+Math.sin(a)*shell*Math.sin(tilt),Math.sin(a)*shell*Math.cos(tilt));
          hist[i].unshift(e.position.clone());if(hist[i].length>9)hist[i].pop();
          trails[i].forEach((g,k2)=>{const h=hist[i][(k2+1)*3-1];if(h)g.position.copy(h);});
        });
        rays.forEach((r,i)=>{const s=((t*.7+i*.33)%1)*4,d=dirs[i];r.position.set(d[0]*s,.4+d[1]*s,d[2]*s);r.material.opacity=Math.max(0,1-s/4);});
      };
    },
  },

  /* 14 - ecg */
  ecg:{
    cam:{radius:10,phi:1.3,theta:.15,target:[.6,1.6,0]},
    controls:[{k:'bpm',label:'হার্ট রেট (BPM)',min:40,max:160,step:1,unit:'',def:72}],
    readouts:p=>[`হৃদস্পন্দন = ${bn(p.bpm)} BPM · T = ${B(60/p.bpm,2)} সে`,p.bpm>100?'⚠️ টাকিকার্ডিয়া':p.bpm<60?'🐢 ব্র্যাডিকার্ডিয়া':'✅ স্বাভাবিক'],
    setup(scene){
      sky(scene,[[0,'#e8f6ff'],[1,'#cfe8de']],'#dceee8',16,45);
      ground(scene,12,'#cfd8dc','#90a4ae');
      const frame=bx(3.4,.22,1.5,mat(0x546e7a));frame.position.set(-.6,.75,0);scene.add(frame);
      [[-2.1,.6],[.9,.6],[-2.1,-.6],[.9,-.6]].forEach(([x,z])=>{const l=cy(.06,.06,.75,mat(0x37474f));l.position.set(x,.37,z);scene.add(l);});
      bx(3.3,.22,1.4,mat(0xffffff)).position.set(-.6,.95,0);scene.add(bx(3.3,.22,1.4,mat(0xffffff)));
      const mattress=bx(3.3,.22,1.4,mat(0xffffff));mattress.position.set(-.6,.95,0);scene.add(mattress);
      const pillow=bx(.7,.18,1,mat(0xb3e5fc));pillow.position.set(-2,1.1,0);scene.add(pillow);
      const head=sph(.22,mat(0xffcf9f));head.position.set(-2,1.32,0);scene.add(head);
      const bodyP=bx(1.6,.3,.8,mat(0xfff3e0));bodyP.position.set(-1,1.18,0);scene.add(bodyP);
      const blanket=bx(1.6,.26,1.2,mat(0x4db6ac));blanket.position.set(.2,1.16,0);scene.add(blanket);
      const heart=new THREE.Group();heart.position.set(-1.1,1.55,0);heart.scale.setScalar(.5);scene.add(heart);
      const hm=mat(0xff3b5c,0x8f0f26,.85);
      const hl=sph(.5,hm);hl.position.set(-.3,.15,0);heart.add(hl);
      const hr=sph(.5,hm.clone());hr.position.set(.3,.15,0);heart.add(hr);
      const ht=new THREE.Mesh(new THREE.ConeGeometry(.7,1,20),mat(0xe02547,0x70091b,.85));ht.rotation.z=Math.PI;ht.position.y=-.4;heart.add(ht);
      const pole=cy(.06,.08,2.4,mat(0x90a4ae));pole.position.set(2.8,1.2,0);scene.add(pole);
      const foot=cy(.45,.5,.1,mat(0x78909c));foot.position.set(2.8,.05,0);scene.add(foot);
      const screenG=new THREE.Group();screenG.position.set(2.8,2.9,0);screenG.rotation.y=-.35;scene.add(screenG);
      screenG.add(bx(.12,2,3.6,mat(0x263238)));
      const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.3,1.7),mat(0x0d1f17,0x0d3a26,.5));
      panel.rotation.y=Math.PI/2;panel.position.x=.08;screenG.add(panel);
      const wirePts=[new THREE.Vector3(-1.1,1.55,.3),new THREE.Vector3(.6,1.9,.7),new THREE.Vector3(2.6,2.3,.3)];
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(wirePts),30,.025,6,false),mat(0x37474f)));
      const N=160,gECG=new THREE.BufferGeometry();
      gECG.setAttribute('position',new THREE.BufferAttribute(new Float32Array(N*3),3));
      const trace=new THREE.Line(gECG,new THREE.LineBasicMaterial({color:0x3ee88a}));
      trace.rotation.y=Math.PI/2;trace.position.x=.1;screenG.add(trace);
      const ecg=ph=>{const gs=(cn,w,h)=>h*Math.exp(-((ph-cn)**2)/(2*w*w));return gs(.2,.035,.18)+gs(.36,.012,-.2)+gs(.4,.016,1.3)+gs(.44,.012,-.3)+gs(.62,.05,.32);};
      return(t,dt,p)=>{
        const T=60/p.bpm,phase=(t%T)/T;
        heart.scale.setScalar(.5*(1+.2*Math.exp(-(((phase-.42+1)%1)**2)/.004)));
        const pos=gECG.attributes.position;
        for(let i=0;i<N;i++){const x=(i/(N-1))*3-1.5,ph=(((t-(i/(N-1))*1.8)%T)/T+1)%1;pos.setXYZ(i,x,ecg(ph)*.55-.1,0);}
        pos.needsUpdate=true;
      };
    },
  },

  /* hero - Shikho galaxy hub */
  hero:{
    cam:{radius:9.5,phi:1.22,theta:.3,target:[0,.6,0],auto:.1,zoom:false},
    controls:[],readouts:()=>[],
    setup(scene,api){
      sky(scene,[[0,'#04140c'],[.6,'#072017'],[1,'#03150e']],'#05160e',16,45);
      const nuc=sph(.6,mat(0xffc53d,0xff8c1a,1.3));nuc.userData.isNucleus=true;
      const nucMorph=morpher(nuc,.16,2);
      const g=new THREE.Group();g.add(nuc);scene.add(g);
      [.5,-.7,1.2].forEach((tilt,i)=>{
        const r=new THREE.Mesh(new THREE.TorusGeometry(2.2,.015,8,90),new THREE.MeshBasicMaterial({color:0x1ec96b,transparent:true,opacity:.4}));
        r.rotation.set(Math.PI/2-tilt,i,0);g.add(r);
      });
      const els=[0,2.1,4.2].map(()=>{const e=sph(.14,mat(0x3ee88a,0x1ec96b,1.8));g.add(e);return e;});
      const orbs=CHAPTERS.map((c,i)=>{
        const col=new THREE.Color(`hsl(${c.hue},90%,62%)`);
        const o=sph(.34,mat(col,col,.9));o.userData.ch=c.id;
        const halo=new THREE.Mesh(new THREE.TorusGeometry(.46,.02,8,32),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.5}));
        halo.rotation.x=Math.PI/2;o.add(halo);
        if(i%3===0){const ring=new THREE.Mesh(new THREE.TorusGeometry(.52,.045,8,28),mat(col,col,.5));ring.rotation.x=Math.PI/2.6;o.add(ring);}
        scene.add(o);return o;
      });
      const parts=[];
      for(let i=0;i<40;i++){const p=sph(.07,new THREE.MeshBasicMaterial({color:0x3ee88a,transparent:true,opacity:0}));p.visible=false;p.userData.v=new THREE.Vector3();p.userData.life=0;scene.add(p);parts.push(p);}
      const burst=(point,color)=>{let n=0;for(const p of parts){if(p.userData.life>0)continue;p.visible=true;p.position.copy(point);p.material.color.set(color||0x3ee88a);p.userData.v.set((Math.random()-.5)*4,Math.random()*3.5,(Math.random()-.5)*4);p.userData.life=1;if(++n>=16)break;}};
      const pGeo=new THREE.PlaneGeometry(30,30,56,56);
      const floor=new THREE.Mesh(pGeo,new THREE.MeshBasicMaterial({color:0x1d6b46,wireframe:true,transparent:true,opacity:.45}));
      floor.rotation.x=-Math.PI/2;floor.position.y=-3;scene.add(floor);
      const sGeo=new THREE.BufferGeometry(),sp=new Float32Array(600*3);
      for(let i=0;i<600;i++){sp[i*3]=(Math.random()-.5)*60;sp[i*3+1]=(Math.random()-.5)*40;sp[i*3+2]=(Math.random()-.5)*60;}
      sGeo.setAttribute('position',new THREE.BufferAttribute(sp,3));
      scene.add(new THREE.Points(sGeo,new THREE.PointsMaterial({color:0xa8f0c8,size:.07})));
      let spinBoost=0,pulse=0,rippleT=-10,extra=0,lastT=0;
      const update=(t,dt)=>{
        lastT=t;nucMorph(t);
        spinBoost=Math.max(0,spinBoost-dt*.8);pulse=Math.max(0,pulse-dt*2.5);
        extra+=spinBoost*dt*6;g.rotation.y=t*.15+extra;g.position.y=.6+Math.sin(t*.8)*.15;
        nuc.scale.setScalar(1+pulse*.5+Math.sin(t*3)*.04);
        const tilts=[.5,-.7,1.2],sps=[1.6,1.9,1.3],phs=[0,2.1,4.2];
        els.forEach((e,i)=>{const a=t*(sps[i]+spinBoost*3)+phs[i];e.position.set(Math.cos(a)*2.2,Math.sin(a)*2.2*Math.sin(tilts[i]),Math.sin(a)*2.2*Math.cos(tilts[i]));});
        orbs.forEach((o,i)=>{const a=t*.18+(i/orbs.length)*Math.PI*2;o.position.set(Math.cos(a)*4.6,.6+Math.sin(t*1.2+i)*.35,Math.sin(a)*4.6);o.rotation.y=t+i;});
        parts.forEach(p=>{if(p.userData.life<=0){p.visible=false;return;}p.userData.life-=dt*1.4;p.userData.v.y-=dt*4;p.position.addScaledVector(p.userData.v,dt);p.material.opacity=Math.max(0,p.userData.life);p.scale.setScalar(.6+p.userData.life);});
        const pos=pGeo.attributes.position,rip=Math.max(0,1-(t-rippleT)*.5);
        for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),d=Math.sqrt(x*x+y*y);let z=Math.sin(d*.8-t*2)*.35*Math.exp(-d*.08);if(rip>0)z+=Math.sin(d*1.4-(t-rippleT)*9)*.7*rip*Math.exp(-d*.12);pos.setZ(i,z);}
        pos.needsUpdate=true;
      };
      const onTap=hit=>{
        let obj=hit.object;while(obj&&!obj.userData.ch&&!obj.userData.isNucleus&&obj.parent)obj=obj.parent;
        if(obj?.userData?.ch){burst(hit.point,new THREE.Color(`hsl(${CHAPTERS.find(c=>c.id===obj.userData.ch).hue},90%,62%)`));api?.onSelect?.(obj.userData.ch);return;}
        if(obj?.userData?.isNucleus||hit.object.userData.isNucleus){spinBoost=1.2;pulse=1;}
        burst(hit.point,0xffc53d);rippleT=lastT;
      };
      return{update,onTap};
    },
  },
};
