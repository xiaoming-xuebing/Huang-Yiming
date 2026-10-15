/* ═══════════ MIDNIGHT GALAXY · resume-v2 ═══════════
   中央专辑大图 + 右侧铬银唱臂 + 全屏星空漩涡（颜色随专辑切换）
   音频：audio/track01~06.mp3（与 v1 相同映射） */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/* 漩涡×黑胶结合模式：?vx=1/2/3（0=默认），CSS 按 body[data-vx] 切换 */
document.body.dataset.vx=(new URLSearchParams(location.search).get('vx')||'0');
/* 极光背景动效开关：?motion=0 静止 / ?motion=1（默认）动效 —— 静止 vs 动效对比用 */
document.body.dataset.motion=(new URLSearchParams(location.search).get('motion')??'0');

/* ── 章节配置（顺序：个人信息→个人优势→AI 碎片→实习经历→项目细节→个人技能）
   color  = 章节主色（唱片/UI 强调色）
   aurora = 对应 NYNA 色卡的五个色值，顺序固定为：
            [主色, 亮心, 暗部, 辉光次色, 暗部→主色的过渡色(两卡色相混)] ── */
const CHAPTERS=[
{id:'hero',       track:'TRACK 01', label:'个人信息', sub:'Profile', note:'WHO I AM · 初见',    color:'#2E5FD0', cover:'assets/covers/track-06.jpg', audio:'audio/track01.mp3', big:['PRO','FILE'], bigPos:['p0','p4'],
   /* 参考图B：宝蓝 × 橙（宝蓝主色/淡天蓝高光/深蓝暗部/炽橙辉光/亮蓝过渡）——与个人技能对换 */
   aurora:['#1E46B4','#C8E4F8','#0A1C74','#E07426','#2A5CC8']},
{id:'experience', track:'TRACK 02', label:'实习经历', sub:'Internship', note:'IN ACTION · 实战', color:'#DC5424', cover:'assets/covers/track-04.jpg', audio:'audio/track04.mp3', big:['INT','ERN','SHIP'],
   /* 参考图A：炽橙 × 墨青（橙红主色/桃色高光/墨青暗部/亮橙辉光/焦橙过渡） */
   aurora:['#DC5424','#F4BE8E','#132A32','#E88A3A','#7E2E1E']},
{id:'featureRail',track:'TRACK 03',  label:'项目细节', sub:'Project', note:'BEHIND · 幕后',    color:'#5054A8', cover:'assets/covers/track-03.jpg', audio:'audio/track06.mp3', big:['PRO','JECT'], bigPos:['p0','p4'],
   /* Card3 BrightFern/DarkAmethyst/OceanTwilight/Thistle/PastelPetal */
   aurora:['#5054A8','#F0C9FA','#350943','#529F0F','#432F75']},
{id:'education',  track:'TRACK 04', label:'AI 碎片', sub:'Fragments', note:'SPARK · 碎片',  color:'#F2A4D8', cover:'assets/covers/education-yozakura.jpg', audio:'audio/track03.mp3', big:['AI','FRA','GMENTS'],
   /* Card5 SoftBlush/BlushPop/Thistle/PacificCyan/SeaGreen；专辑图=YOZAKURA 夜樱封面 */
   aurora:['#F2A4D8','#FFE9E9','#008748','#3098A4','#799690']},
{id:'advantages', track:'TRACK 05', label:'个人优势', sub:'Advantages', note:'WHY ME · 亮点', color:'#25C5E9', cover:'assets/covers/track-05.jpg', audio:'audio/track02.mp3', big:['ADV','ANT','AGES'],
   /* Card2 MintCream/TeaGreen/SkyAqua/DarkCyan/InkBlack；封面沿用原教育背景封面图 */
   aurora:['#25C5E9','#F2FFF6','#021225','#CAFFDE','#238689']},
{id:'skills',     track:'TRACK 06', label:'个人技能', sub:'Skills', note:'TOOLBOX · 武器库',     color:'#3E4B8E', cover:'assets/covers/track-01.jpg', audio:'audio/track05.mp3', big:['SKI','LLS'], bigPos:['p0','p4'],
   /* Card1 Seashell/Wheat/PowderBlue/FrenchBlue/MidnightViolet——与个人信息对换 */
   aurora:['#3E4B8E','#FFF4EB','#3D1534','#F6E0B6','#3E3061']},
];
const N=CHAPTERS.length;
let cur=0, playingIntent=false, swapping=false, armTarget=0;

/* ═══════════ 星空漩涡（移植自 intro.html cosmos，颜色随主题参数化） ═══════════ */
const cv=$('cosmos'), ctx=cv.getContext('2d');
let W=0,H=0,dpr=Math.min(devicePixelRatio||1,2);
let cx=0,cy=0,rx=0,ry=0;
const TILT=1.0, ROT=0.7;   /* 顶视正圆（与 intro 终态 tiltK=1 一致） */
let RING_COUNT=100;        /* 密环（参考亮蓝同心光环）；窄屏降密度，避免手机端漩涡过密 */
const rMap=t=>0.24+Math.pow(t,0.8)*0.72;   /* 甜甜圈：内圈从 0.24R 起，中心留黑洞 */
let parts=[], starParts=[];

function hexRGB(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function mixc(a,b,t){return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];}
function paletteFor(hex){
  const main=hexRGB(hex);
  return {
    main: main,
    light: mixc(main,[255,255,255],.45),
    deep:  mixc(main,[8,12,24],.45),
  };
}
let palCur=paletteFor(CHAPTERS[0].color), palTgt=paletteFor(CHAPTERS[0].color);

function layout(){
  W=innerWidth; H=innerHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  cv.style.width=W+'px'; cv.style.height=H+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  /* 焦点 x 与 CSS 的 --fx 保持同一数值：中央唱片/黑胶/漩涡共用 */
  const fxv=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fx'))||.665;
  cx=W<900?W/2:W*fxv; cy=H*(W<900?0.40:0.47);   /* 窄屏漩涡上移：底部有播放面板，构图重心平衡 */
  rx=Math.min(W*0.40,H*0.54);   /* 大漩涡收小一点，与中央唱片之间留出呼吸空间 */
  ry=rx*TILT;
}
function buildField(){
  parts=[];
  /* 窄屏降密度：手机屏幕小、漩涡视觉半径大，同样粒子数显得挤成一团。
     环数降到 ~66%，每环粒子降到 ~78%，总粒子约一半，沟槽间距拉开更透气 */
  const narrow=W<900;
  RING_COUNT=narrow?66:100;
  const perMul=narrow?0.78:1;
  for(let ring=0;ring<RING_COUNT;ring++){
    const t=ring/RING_COUNT;
    const rBase=rMap(t);
    const perRing=Math.round((7+(1-t)*13)*perMul);
    for(let i=0;i<perRing;i++){
      const rnd=Math.random();
      parts.push({
        a:Math.random()*Math.PI*2,
        r:rBase+(Math.random()-0.5)*0.006,
        sp:1.0+(Math.random()-0.5)*0.04,
        sz:0.9+Math.random()*1.4,
        streak:0.14+Math.random()*0.42,
        tone:rnd<0.5?'silver':(rnd<0.8?'gold':'blue'),
        thick:0.5+Math.random()*0.4,
        bright:Math.random()
      });
    }
  }
  starParts=[];
  const starN=narrow?100:160;
  for(let i=0;i<starN;i++){
    starParts.push({x:Math.random(),y:Math.random(),s:Math.random()*1.1+0.2,tw:Math.random()*Math.PI*2,tws:0.5+Math.random()*1.5});
  }
}
/* 鼠标搅动（带位移硬上限，与 intro 相同策略） */
let mouseX=0,mouseY=0,mouseVX=0,mouseVY=0,lastMX=0,lastMY=0;
const SIG=0.19, maxA=0.09, HARD_LIM=0.09;
addEventListener('mousemove',e=>{
  mouseVX+=e.clientX-lastMX; mouseVY+=e.clientY-lastMY;
  lastMX=mouseX=e.clientX; lastMY=mouseY=e.clientY;
},{passive:true});

function stir(px,py){
  const mdx=mouseX-cx-px, mdy=mouseY-cy-py;
  const d2=mdx*mdx+mdy*mdy;
  const sig=SIG*rx, sig2=sig*sig;
  if(d2>sig2*9) return [px,py];
  const amp=Math.exp(-d2/sig2)*maxA*rx;
  const mv=Math.hypot(mouseVX,mouseVY);
  let ox=0,oy=0;
  if(mv>0.01){ ox=(mouseVX/mv)*amp; oy=(mouseVY/mv)*amp; }
  else{ const d=Math.sqrt(d2)||1; ox=(mdx/d)*amp*0.5; oy=(mdy/d)*amp*0.5; }
  const ol=Math.hypot(ox,oy), lim=rx*HARD_LIM;
  if(ol>lim){ ox=ox/ol*lim; oy=oy/ol*lim; }
  return [px+ox,py+oy];
}

function frame(t){
  /* 主题色平滑过渡 */
  for(const k of ['main','light','deep']){
    for(let i=0;i<3;i++) palCur[k][i]+= (palTgt[k][i]-palCur[k][i])*0.045;
  }
  ctx.clearRect(0,0,W,H);

  /* 背景星点 */
  for(const s of starParts){
    const a=0.4+0.6*(0.5+0.5*Math.sin(t*s.tws+s.tw));
    ctx.fillStyle=`rgba(210,225,245,${a*0.8})`;
    ctx.beginPath(); ctx.arc(s.x*W,s.y*H,s.s*1.3,0,Math.PI*2); ctx.fill();
  }

  const [mr,mg,mb]=palCur.main, [lr,lg,lb]=palCur.light, [dr,dg,db]=palCur.deep;

  /* 甜甜圈内缘亮环光晕（参考图4：内圈最亮，向外衰减） */
  let core=ctx.createRadialGradient(cx,cy,rx*0.20,cx,cy,rx*0.42);
  core.addColorStop(0,`rgba(${lr|0},${lg|0},${lb|0},.34)`);
  core.addColorStop(0.45,`rgba(${mr|0},${mg|0},${mb|0},.16)`);
  core.addColorStop(1,'rgba(8,12,24,0)');
  ctx.fillStyle=core;
  ctx.beginPath(); ctx.ellipse(cx,cy,rx*0.42,ry*0.42,0,0,Math.PI*2); ctx.fill();

  /* 银河暗盘底 */
  let base=ctx.createRadialGradient(cx,cy,0,cx,cy,rx);
  base.addColorStop(0,'rgba(14,20,38,.30)');
  base.addColorStop(0.6,'rgba(9,13,26,.16)');
  base.addColorStop(1,'rgba(5,8,16,0)');
  ctx.fillStyle=base;
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fill();

  /* 细密沟槽环 */
  ctx.save(); ctx.translate(cx,cy);
  ctx.strokeStyle=`rgba(${lr|0},${lg|0},${lb|0},.05)`; ctx.lineWidth=0.5;
  for(let ring=0;ring<RING_COUNT;ring++){
    const rr=rMap(ring/RING_COUNT)*rx;
    ctx.beginPath(); ctx.ellipse(0,0,rr,rr*TILT,0,0,Math.PI*2); ctx.stroke();
  }
  /* 内缘两道亮环（甜甜圈亮边） */
  ctx.strokeStyle=`rgba(${lr|0},${lg|0},${lb|0},.34)`; ctx.lineWidth=1.6;
  ctx.beginPath(); ctx.ellipse(0,0,rx*0.242,rx*0.242*TILT,0,0,Math.PI*2); ctx.stroke();
  ctx.strokeStyle=`rgba(${lr|0},${lg|0},${lb|0},.13)`; ctx.lineWidth=4;
  ctx.beginPath(); ctx.ellipse(0,0,rx*0.256,rx*0.256*TILT,0,0,Math.PI*2); ctx.stroke();
  ctx.restore();

  /* 银河粒子：3段渐变拖尾 + 沿弧颗粒 + 头部亮点 */
  ctx.save(); ctx.translate(cx,cy); ctx.lineCap='round';
  for(const p of parts){
    const ang=p.a+t*p.sp*ROT;
    const r_eff=p.r*rx;
    const aHead=ang, aTail=ang-p.streak;
    const dim=0.55+0.45*p.bright;
    const rimK=p.r<0.34?1.5:1;   /* 内缘粒子提亮，模拟甜甜圈亮环 */
    const bHi=p.bright>0.80, bMid=p.bright>0.5;
    let cR,cG,cB,baseAlpha;
    if(p.tone==='gold'){           /* 主题主色 */
      const c=mixc(palCur.main,[255,255,255],dim*0.22);
      cR=c[0];cG=c[1];cB=c[2];
      baseAlpha=(bHi?0.55+0.30*dim:bMid?0.34+0.26*dim:0.22+0.18*dim)*(0.7+p.thick*0.3)*rimK;
    }else if(p.tone==='blue'){     /* 主题浅色 */
      const c=mixc(palCur.light,[255,255,255],dim*0.18);
      cR=c[0];cG=c[1];cB=c[2];
      baseAlpha=(bHi?0.50+0.30*dim:bMid?0.32+0.24*dim:0.20+0.16*dim)*(0.7+p.thick*0.3)*rimK;
    }else{                         /* 银白（结构色，不随主题变） */
      const b=(bHi?226:bMid?184:140)+dim*26;
      cR=b;cG=b+6;cB=b+26;
      baseAlpha=(bHi?0.60+0.28*dim:bMid?0.36+0.24*dim:0.22+0.16*dim)*(0.7+p.thick*0.3)*rimK;
    }
    const SEG=3;
    for(let s=0;s<SEG;s++){
      const f0=s/SEG,f1=(s+1)/SEG;
      const segAlpha=baseAlpha*(0.18+0.82*((f0+f1)/2));
      ctx.strokeStyle=`rgba(${cR|0},${cG|0},${cB|0},${segAlpha})`;
      ctx.lineWidth=p.sz*(0.9+0.5*((f0+f1)/2));
      ctx.beginPath();
      for(let ss2=s;ss2<=s+1;ss2++){
        const f=ss2/SEG, a=aTail+(aHead-aTail)*f;
        let px=Math.cos(a)*r_eff, py=Math.sin(a)*r_eff*TILT;
        [px,py]=stir(px,py);
        if(ss2===s) ctx.moveTo(px,py); else ctx.lineTo(px,py);
      }
      ctx.stroke();
    }
    /* 沿弧颗粒 */
    if(p.bright>0.4){
      const dotFrac=[0.3+p.bright*0.5];
      if(p.bright>0.7) dotFrac.push(0.7-p.thick*0.3);
      for(const df of dotFrac){
        const da=aTail+(aHead-aTail)*df;
        let dpx=Math.cos(da)*r_eff, dpy=Math.sin(da)*r_eff*TILT;
        [dpx,dpy]=stir(dpx,dpy);
        const dotAlpha=0.5+0.4*dim;
        let dcr,dcg,dcb;
        if(p.tone==='gold'){ dcr=mr;dcg=mg;dcb=mb; }
        else if(p.tone==='blue'){ dcr=lr;dcg=lg;dcb=lb; }
        else{ dcr=218;dcg=228;dcb=248; }
        ctx.fillStyle=`rgba(${dcr|0},${dcg|0},${dcb|0},${dotAlpha})`;
        ctx.beginPath(); ctx.arc(dpx,dpy,p.sz*0.6,0,Math.PI*2); ctx.fill();
      }
    }
    /* 头部亮点 */
    if(p.bright>0.4){
      let hx=Math.cos(aHead)*r_eff, hy=Math.sin(aHead)*r_eff*TILT;
      [hx,hy]=stir(hx,hy);
      ctx.fillStyle=`rgba(${cR|0},${cG|0},${cB|0},${0.5+0.4*dim})`;
      ctx.beginPath(); ctx.arc(hx,hy,p.sz*0.85,0,Math.PI*2); ctx.fill();
    }
  }
  ctx.restore();

  /* 唱臂朝向目标缓动：播放→落针 k=1，暂停→抬针 k=0；模型就绪后淡入 */
  armK+=(armTarget-armK)*(reduced?1:0.055);
  if(armReadyFlag&&armShown<1) armShown+=(1-armShown)*(reduced?1:0.04);
  updateArm();

  mouseVX*=0.9; mouseVY*=0.9;
}

/* ── 3D 唱臂状态驱动（与 intro 相同的 __arm3dState 协议，顶视 tiltK=1） ── */
let armK=0, armShown=0, armReadyFlag=false;
function updateArm(){
  const S=window.__arm3dState;
  if(!S) return;
  S.W=W; S.H=H;
  /* P：枢轴，漩涡右上外圈之外；N：针尖落点，封面外缘外的星轨沟槽（≈0.34R） */
  S.Px=cx+rx*0.98; S.Py=cy-rx*0.92;
  if(W<900){
    /* 窄屏：封面≈0.57rx、黑胶盘缘≈0.80rx，针尖改落黑胶环带中线（沿用桌面同一方位角） */
    S.Nx=cx+rx*0.60; S.Ny=cy+rx*0.195;
  }else{
    S.Nx=cx+rx*0.325; S.Ny=cy+rx*0.105;
  }
  S.tiltK=1; S.shiftX=0; S.drop=0; S.restDelta=0.62;
  S.starShown=0; S.starGlow=0;   /* 不显示蓝色星体 */
  S.k=armK; S.shown=armShown;
}
window.addEventListener('arm3dready',()=>{ armReadyFlag=true; if(reduced){armShown=1;updateArm();} });
window.addEventListener('arm3dfailed',()=>{ showToast('3D 唱臂模型加载失败，请刷新重试'); });

/* ═══════════ 亚克力小光盘：封面搅动虹彩特效（WebGL） ═══════════ */
const mc=$('mcCanvas');
const gl=mc&&mc.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:true});
let mcProg=null, mcTex=null, mcU={}, mcQuad=null, mcIce=[0.69,0.75,0.83];
function mcInit(){
  if(!gl){ if(mc){ mc.style.background="url('"+CHAPTERS[0].cover+"') center/cover"; mc.style.borderRadius='50%'; } return; }
  const vs='attribute vec2 aP;void main(){gl_Position=vec4(aP,0.,1.);}';
  const fs=`precision mediump float;
uniform sampler2D uTex;uniform float uT;uniform vec2 uRes;uniform vec3 uIce;
void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*uRes)/min(uRes.x,uRes.y);
  float r=length(uv)*2.0;
  float ang=atan(uv.y,uv.x);
  /* 搅动：角度随半径扭曲+缓慢流动，封面被搅成漩涡纹 */
  float tw=ang+uT*0.12+2.6*exp(-r*2.4)*sin(uT*0.22)+sin(r*9.0-uT*0.5)*0.30*exp(-r*1.5);
  vec2 p=vec2(cos(tw),sin(tw))*r*0.52+0.5;
  vec3 col=texture2D(uTex,clamp(p,0.002,0.998)).rgb;
  vec3 sm=texture2D(uTex,clamp(vec2(cos(tw+0.24),sin(tw+0.24))*r*0.52+0.5,0.002,0.998)).rgb;
  col=mix(col,sm,0.55);
  /* 虹彩薄膜干涉环带 */
  float band=sin(r*44.0-uT*0.7)*sin(ang*4.0+uT*0.35);
  vec3 iri=0.5+0.5*cos(6.28318*(r*1.8-uT*0.10+vec3(0.0,0.33,0.67)));
  col+=iri*0.35*smoothstep(0.1,0.9,band*0.5+0.5)*(1.0-r*0.55);
  /* 主题色微染 */
  col=mix(col,col*uIce*1.7,0.20);
  /* 玻璃高光弧两段 */
  float sp1=exp(-pow((ang-2.4-uT*0.05)*1.4,2.0))*exp(-pow((r-0.66)*3.2,2.0));
  float sp2=exp(-pow((ang+0.6+uT*0.05)*2.0,2.0))*exp(-pow((r-0.9)*4.0,2.0));
  col+=vec3(1.0)*sp1*0.5+vec3(0.9,0.95,1.0)*sp2*0.3;
  /* 边缘压暗+圆形裁切 */
  float edge=smoothstep(1.0,0.96,r);
  col*=0.72+0.28*edge;
  gl_FragColor=vec4(col*edge,edge);
}`;
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);
    if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.error(gl.getShaderInfoLog(s));return null;}return s;}
  const v=sh(gl.VERTEX_SHADER,vs), f=sh(gl.FRAGMENT_SHADER,fs);
  if(!v||!f) return;
  mcProg=gl.createProgram(); gl.attachShader(mcProg,v); gl.attachShader(mcProg,f); gl.linkProgram(mcProg);
  if(!gl.getProgramParameter(mcProg,gl.LINK_STATUS)){console.error(gl.getProgramInfoLog(mcProg));mcProg=null;return;}
  gl.useProgram(mcProg);
  mcQuad=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,mcQuad);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const aP=gl.getAttribLocation(mcProg,'aP');
  gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP,2,gl.FLOAT,false,0,0);
  mcU.t=gl.getUniformLocation(mcProg,'uT');
  mcU.res=gl.getUniformLocation(mcProg,'uRes');
  mcU.ice=gl.getUniformLocation(mcProg,'uIce');
  mcU.tex=gl.getUniformLocation(mcProg,'uTex');
  gl.uniform1i(mcU.tex,0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
}
function mcSetCover(url){
  if(!gl||!mcProg) { if(mc&&!gl){ mc.style.background="url('"+url+"') center/cover"; } return; }
  const img=new Image();
  img.onload=()=>{
    const t=gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
    mcTex=t;
    if(reduced) mcRender(8.0);
  };
  img.src=url;
}
function mcResize(){
  if(!gl||!mc) return;
  const w=mc.clientWidth||200;
  mc.width=w*dpr; mc.height=w*dpr;
}
function mcRender(t){
  if(!gl||!mcProg||!mcTex) return;
  gl.viewport(0,0,mc.width,mc.height);
  gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform1f(mcU.t,t);
  gl.uniform2f(mcU.res,mc.width,mc.height);
  gl.uniform3f(mcU.ice,mcIce[0],mcIce[1],mcIce[2]);
  gl.bindTexture(gl.TEXTURE_2D,mcTex);
  gl.drawArrays(gl.TRIANGLES,0,3);
}
mcInit(); mcSetCover(CHAPTERS[0].cover); mcResize();
layout(); buildField();
addEventListener('resize',()=>{ layout(); buildField(); });
/* 极光已一次性渲染成静态场（aurRender），动效由 CSS 整层漂移负责，这里不再逐帧绘制 */
if(reduced){ frame(0); }
else{
  const loop=()=>{
    const t=performance.now()/1000;
    frame(t); mcRender(t);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
addEventListener('resize',()=>{ mcResize(); });

/* ═══════════ 极光场（低分辨率 canvas 一次性绘制静态色场） ═══════════
   640×360 绘制再拉伸到全屏 → 色场天然柔化、颗粒被放大成细腻磨砂；
   动效只做整层 CSS 漂移，不逐帧重绘 —— 漩涡与性能都不受影响。 */
const aurCv=$('aurora'), actx=aurCv.getContext('2d');
const AW=800, AH=450;   /* 提高分辨率：细颗粒放大 2.4 倍后仍细腻（像胶片噪点而不是网点） */
aurCv.width=AW; aurCv.height=AH;
/* value noise：置换表 + 双线性插值（固定种子洗牌 → 每次刷新背景完全一致，便于调参与复现） */
const AUP=new Uint8Array(512);
{ const p=[]; for(let i=0;i<256;i++)p.push(i);
  let s=20261011;
  for(let i=255;i>0;i--){ s=(s*9301+49297)%233280; const j=s%(i+1); const tt=p[i]; p[i]=p[j]; p[j]=tt; }
  for(let i=0;i<512;i++)AUP[i]=p[i&255]; }
const auFade=x=>x*x*(3-2*x);
function auNoise(x,y){
  const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi;
  const g=(X,Y)=>AUP[(AUP[((X%256)+256)%256]+Y)&255]/255;
  const a=g(xi,yi),b=g(xi+1,yi),c=g(xi,yi+1),d=g(xi+1,yi+1);
  const u=auFade(xf),v=auFade(yf);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
function auFbm(x,y,oct){
  let s=0,amp=.5,f=1;
  for(let i=0;i<oct;i++){s+=amp*auNoise(x*f,y*f);amp*=.5;f*=2.03;}
  return s;
}
/* ── 印刷极光（halftone aurora）：全幅深蓝场 + 对角流场 + 青色辉光 + 暗影 + 补色高光 + 网点 + 切片线 ──
   参考质感：halftone 渐变网点 + 胶片颗粒 + 横向切片。一次性渲染成静态场，
   动效模式只让整层缓慢漂移（CSS transform），不逐帧重绘 —— 漩涡与性能都不受影响。 */
let aurRGB=[[62,99,216],[191,224,245],[20,31,94],[94,130,216],[42,47,110]];
const cMix=(a,b,t)=>[Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)];
function aurPalette(){
  /* 直接使用每章色卡的 5 个颜色（主色/亮心/暗部/次色/深部），不再从主色派生 */
  const C=aurRGB;
  return{
    ink :C[2].map(v=>Math.round(v*.42)),   /* 暗部色再压暗 → 近黑阴影 */
    deep:C[2],                             /* 暗部 */
    mid :C[4],                             /* 深部过渡 */
    teal:C[0],                             /* 主色（辉光主体） */
    glow:C[3],                             /* 次色 */
    acc :C[1]                              /* 亮心（最亮高光） */
  };
}
/* 漩涡避让：算出漩涡在归一化画面里的椭圆范围（与 layout() 的 cx/cy/rx 同式），
   极光在该范围内按距离压暗 —— 亮色带被挤到外围，漩涡本体只在暗色带上，不被抢戏。 */
function aurVortex(){
  const w=innerWidth||1440, h=innerHeight||900;
  const fxv=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fx'))||.68;
  const rpx=Math.min(w*0.40,h*0.54);
  /* 给压暗范围一个下限：矮窗口（漩涡水平半径变小）时也不会只剩一小块被压暗 */
  return {fx:(w<900?.5:fxv), fy:(w<900?.40:.47), rx:Math.max(rpx/w,.22), ry:Math.max(rpx/h,.44)};
}
const AUR_DIM=0.46;          /* 漩涡正中心保留的亮度比例（越小 → 漩涡底下越沉） */
function aurRender(){
  const P=aurPalette(), img=actx.createImageData(AW,AH), d=img.data;
  const NP=AW*AH, B=new Float32Array(NP);
  const V=aurVortex();
  let mn=1e9,mx=-1e9;
  for(let y=0;y<AH;y++){
    const v=y/AH;
    for(let x=0;x<AW;x++){
      const u=x/AW;
      /* 对角流场：大结构为主 + 很轻的中频（参考图是大团喷枪渐变，不是细波纹） */
      const n1=auFbm((u+v*.38)*2.6+3.7, v*2.1+u*.22+8.1, 4);
      const n2=auFbm((u+v*.30)*5.2+17.3, v*3.6+2.7, 2);
      const b=n1*1.05+n2*.32-.14;
      const i=y*AW+x; B[i]=b;
      if(b<mn)mn=b; if(b>mx)mx=b;
    }
  }
  /* 亮度 → 排名（直方图均衡）：把「压暗后」的亮度按全局排名映射到 0..1。
     好处有三：① 色带面积严格等于 SEG，6 个颜色都出现且亮心走满；
     ② 暗的排名落在漩涡上、亮的排名被推到漩涡之外；
     ③ 漩涡内部虽然整体变暗，但相对层次被重新拉开，不会糊成死黑一片。 */
  /* 亮端占比略收（末段 .20→.15）；亮的仍保留，只是被漩涡压暗挤到外围去 */
  const SEG=[.19,.24,.26,.19,.12];             /* 5 个渐变区间的目标面积占比 */
  const bins=new Uint32Array(256);
  let qmn=1e9,qmx=-1e9;
  for(let y=0;y<AH;y++){
    const v=y/AH, dyv=(v-V.fy)/V.ry;
    for(let x=0;x<AW;x++){
      const u=x/AW, dxu=(u-V.fx)/V.rx;
      /* 到漩涡中心的归一化距离：1 = 漩涡外缘；>1.30 起不再压暗 */
      const dd=Math.sqrt(dxu*dxu+dyv*dyv);
      let wg=(dd-0.06)/1.24; wg=wg<0?0:wg>1?1:wg;
      wg=wg*wg*(3-2*wg);                                   /* smoothstep：过渡不生硬 */
      const i=y*AW+x;
      let q=(B[i]-mn)/(mx-mn); q=q<0?0:q>1?1:q;
      q*= AUR_DIM+(1-AUR_DIM)*wg;                          /* 漩涡处压暗 */
      B[i]=q;
      if(q<qmn)qmn=q; if(q>qmx)qmx=q;
    }
  }
  /* 直方图（按压暗后的真实极值分箱，避免上界够不到） */
  const span=(qmx-qmn)||1;
  for(let i=0;i<NP;i++){
    let bn=((B[i]-qmn)/span*255)|0; bn=bn<0?0:bn>255?255:bn;
    bins[bn]++;
  }
  const cum=new Uint32Array(257);              /* 累积分布 → 排名 */
  for(let bn=0;bn<256;bn++)cum[bn+1]=cum[bn]+bins[bn];
  const cuts=new Float32Array(6);              /* 排名空间里色带边界 = SEG 累加值 */
  { let acc=0; cuts[0]=0; for(let k=0;k<5;k++){acc+=SEG[k];cuts[k+1]=acc;} cuts[5]=1.0001; }
  const CC=[P.ink,P.deep,P.mid,P.teal,P.glow,P.acc];
  for(let y=0;y<AH;y++){
    for(let x=0;x<AW;x++){
      const i=y*AW+x, q=B[i];
      let bn=((q-qmn)/span*255)|0; bn=bn<0?0:bn>255?255:bn;
      const uq=(cum[bn]+bins[bn]*0.5)/NP;                  /* 该像素的全局排名 0..1 */
      let k=0; while(k<4&&uq>=cuts[k+1])k++;
      let t=Math.min(1,Math.max(0,(uq-cuts[k])/Math.max(1e-4,cuts[k+1]-cuts[k])));
      if(k===4)t=Math.pow(t,1.12);                         /* 亮心略微收敛：高光不铺满，但仍有亮点 */
      const c=cMix(CC[k],CC[k+1],t);
      /* 胶片细颗粒：逐像素均匀白噪（auNoise 传整数 → 取格点值，每像素独立），
         幅度 ±5 且正负对称——细看是磨砂颗粒，远看渐变依然平滑（参考图的胶片质感）。 */
      const gn=(auNoise(x+13,y+29)-.5)*10;
      const o=i*4;
      d[o]  =c[0]*0.93+gn;
      d[o+1]=c[1]*0.93+gn;
      d[o+2]=c[2]*0.93+gn;
      d[o+3]=255;
    }
  }
  actx.putImageData(img,0,0);
}
aurRender();
function aurRebuild(aurora){ /* setTheme 调用：切章节色卡后重渲染极光场 */
  if(aurora&&aurora.length>=5){ aurRGB=aurora.map(hexRGB); aurRender(); }
}

/* ═══════════ 主题色切换 ═══════════ */
const root=document.documentElement;
function hexHSL(h){
  const[r,g,b]=hexRGB(h).map(v=>v/255);
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let hh=0,s=0,l=(mx+mn)/2;
  if(mx!==mn){const d=mx-mn;s=l>0.5?d/(2-mx-mn):d/(mx+mn);
    if(mx===r)hh=(g-b)/d+(g<b?6:0);else if(mx===g)hh=(b-r)/d+2;else hh=(r-g)/d+4;hh*=60;}
  return[hh,s*100,l*100];
}
function setTheme(hex,aurora){
  const [r,g,b]=hexRGB(hex);
  root.style.setProperty('--ice',hex);
  root.style.setProperty('--ice-soft',`rgba(${r},${g},${b},.55)`);
  /* 极光五团：直接取各章对应的 NYNA 色卡色（主色/亮心/暗部/余晖/过渡） */
  if(aurora&&aurora.length>=5){
    aurora.forEach((c,i)=>root.style.setProperty('--a'+(i+1),c));
  }else{
    const[hh,ss,ll]=hexHSL(hex);
    const sat=Math.min(Math.max(ss*1.15,72),95);
    root.style.setProperty('--a1',`hsl(${hh},${sat}%,${Math.min(ll+18,72)}%)`);
    root.style.setProperty('--a2',`hsl(${(hh+38)%360},${sat-8}%,${Math.min(ll+14,68)}%)`);
    root.style.setProperty('--a3',`hsl(${(hh+318)%360},${sat}%,${Math.min(ll+8,62)}%)`);
    root.style.setProperty('--a4',`hsl(${(hh+16)%360},${Math.max(sat-22,45)}%,${Math.min(ll+26,80)}%)`);
    root.style.setProperty('--a5',`hsl(${(hh+300)%360},${sat-12}%,${Math.min(ll+4,58)}%)`);
  }
  palTgt=paletteFor(hex);
  aurRebuild(aurora);   /* 极光丝帘换色 */
  mcIce=[r/255,g/255,b/255];
}

/* ═══════════ 音频播放器 ═══════════ */
const audio=new Audio();
audio.preload='auto';
const ICON_PLAY='M8 5v14l11-7z', ICON_PAUSE='M6 5h4v14H6zM14 5h4v14h-4z';
const toast=$('toast'); let toastTimer=null;
function showToast(msg){ toast.textContent=msg; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('show'),2200); }
function fmt(s){ if(!isFinite(s)||s<0) return '--:--'; s=Math.floor(s); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function syncPlayUI(){
  document.body.classList.toggle('playing',!audio.paused);
  armTarget=(W<900||!audio.paused)?1:0;   /* 窄屏唱臂常驻：不播歌也落针在唱片上 */
  if(reduced){ armK=armTarget; updateArm(); }
  /* 封套下方播放器的播放键同步 */
  const pi=document.getElementById('playIcon');
  if(pi) pi.setAttribute('d',audio.paused?ICON_PLAY:ICON_PAUSE);
}
audio.addEventListener('play',syncPlayUI);
audio.addEventListener('pause',syncPlayUI);
syncPlayUI();   /* 初始同步一次：窄屏唱臂不播歌也搭在唱片上 */
audio.addEventListener('timeupdate',()=>{
  if(audio.duration){
    const pct=audio.currentTime/audio.duration*100;
    /* 封套下方播放器：进度条与当前时间（拖动中不抢） */
    const sk=document.getElementById('seek'), tc=document.getElementById('tCur');
    if(sk&&document.activeElement!==sk){ sk.value=String(Math.round(pct*10)); sk.style.setProperty('--fill',pct.toFixed(2)+'%'); }
    if(tc) tc.textContent=fmt(audio.currentTime);
  }
});
audio.addEventListener('loadedmetadata',()=>{
  const tt=document.getElementById('tTot'); if(tt) tt.textContent=fmt(audio.duration);
});
audio.addEventListener('ended',()=>{ stepTo(1,true); });
audio.addEventListener('error',()=>{
  showToast('音频加载失败：'+CHAPTERS[cur].audio+'（请确认文件存在）');
});
function loadTrack(autoplay){
  const ch=CHAPTERS[cur];
  audio.src=ch.audio;
  if(autoplay){
    playingIntent=true;
    /* 切 src 后立刻 play() 可能因数据未就绪被浏览器拦截（返回 rejected promise）。
       先 load() 确保流就绪，再 play()；失败静默重试一次，仍失败才提示。 */
    audio.load();
    const pr=audio.play();
    if(pr&&pr.catch) pr.catch(()=>{
      audio.addEventListener('loadeddata', function retry(){ audio.play().catch(()=>{ showToast('浏览器拦截了自动播放，请点击播放键'); }); audio.removeEventListener('loadeddata', retry); }, {once:true});
    });
  }
}
function stepTo(d,force){ /* force=true：强制续播（歌曲自然播完自动切下一首）；否则跟随当前播放状态 */
  const auto = force ? true : !audio.paused;
  setChapter((cur+d+N)%N,{autoplay:auto});
}

/* ═══════════ 章节切换 ═══════════ */
const discWrap=$('discWrap'), discImg=$('discImg');
const dcTrack=$('dcTrack'), dcLabel=$('dcLabel'), dcSub=$('dcSub');
/* ═══════════ 章节条带选择器（Strip Deck，v47 替代圆环卡阵） ═══════════
   六个章节 = 上下堆叠的横条带；滚轮（或点击两侧条）让条带滑动，
   滑到中心的条带放大展开（大封面 + 大标题），其余变窄变暗；
   点击中心条 = 选中该章并收回条带，回到封套画面（以美为主）。
   —— 可调参数集中在 STRIP 里，改完刷新即可：                              */
const STRIP={
  S_FR:.21, S_FRW:.19,           /* 中心正方形边长 = min(vh×S_FR, vw×S_FRW)，与封套 .mc-pack 同大 */
  SCALE:[1,.78,.6,.48],          /* 按距离缩放：中心 1，d=1/2/≥3（正方形，等比） */
  GAP:.15,                       /* 卡片净间距 = 中心边长 × GAP（正方形后间距拉大） */
  MIN_GAP:16,                    /* 间距下限 px */
  CENTER_Y:.45                   /* 卡片列垂直中心（与封套同高，滑动原地发生） */
};
function hexRGBA(h,a){h=h.replace('#','');return 'rgba('+parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16)+','+a+')';}
const stripDeck=$('stripDeck');
const strips=[];             /* strips[i] = 章节条带按钮 */
let stripFocus=0;            /* 当前居中的条带（展开态） */
CHAPTERS.forEach((c,i)=>{
  const b=document.createElement('button');
  b.type='button'; b.className='strip'; b.tabIndex=0;
  b.setAttribute('role','button');
  b.setAttribute('aria-label','切换到 '+c.track+' '+c.label);
  b.style.setProperty('--acc',c.color);
  b.style.setProperty('--acc-glow',hexRGBA(c.color,.28));
  b.innerHTML=
    '<i class="st-bg" style="background-image:url(\''+c.cover+'\')"></i>'+
    '<i class="st-shade"></i>'+
    '<span class="st-meta">'+
      '<span class="st-tag">'+c.track+'</span>'+
      '<span class="st-name">'+c.label+'</span>'+
      '<span class="st-sub">'+c.sub+' · DOLLHOUSE</span>'+
    '</span>'+
    '<span class="st-go">进入 OPEN →</span>';
  b.addEventListener('click',()=>{
    /* v99：单击直接选中该章（去掉"先滑到中心再点一次"两步制）；
       中心卡防重弹的 packHold 由 bindPlayer 里的 strips.forEach 统一处理 */
    setChapter(i,{autoplay:!audio.paused});
    setDeck(false);
  });
  stripDeck.appendChild(b);
  strips.push(b);
});
/* 卡片列布局：正方形封面卡，中心 = 封套同大；按距离等比缩小；
   上下方向各自自适应——空间不够时整列等比微缩，保证任何窗口都不溢出 */
function layoutStrips(){
  if(!stripDeck) return;
  if(W<900){   /* 窄屏回退为底部横排（CSS 接管）：清掉内联坐标 */
    strips.forEach(s=>['transform','width','height','zIndex'].forEach(p=>s.style.removeProperty(p)));
    return;
  }
  /* 中心正方形永远 = 封套大小（核心：卡片在封套原地接棒）；
     空间不够时只缩两侧卡和间距（二分找最大可行系数，下限 .55），
     再装不下的部分由窗口自然裁切 —— 远端小卡淡出成"下面还有"的暗示 */
  const s0=Math.min(H*STRIP.S_FR,W*STRIP.S_FRW);
  const gap0=Math.max(STRIP.MIN_GAP,s0*STRIP.GAP);
  const cY=H*STRIP.CENTER_Y;
  const fit=t=>{                                   /* 系数 t 下两个方向各需多少高度 */
    const size=d=>d===0?s0:s0*STRIP.SCALE[Math.min(d,3)]*t;
    const g=gap0*t;
    const seg=k=>(size(k)+size(k+1))/2+g;
    const up=s0/2+(stripFocus>0?Array.from({length:stripFocus},(_,k)=>seg(k)).reduce((a,b)=>a+b,0):0);
    const dn=s0/2+(stripFocus<strips.length-1?Array.from({length:strips.length-1-stripFocus},(_,k)=>seg(k)).reduce((a,b)=>a+b,0):0);
    return {up:up<=(cY-16),dn:dn<=(H-cY-16)};
  };
  let lo=.55,hi=1;
  if(!fit(hi).up||!fit(hi).dn){                    /* 全尺寸放不下 → 二分缩侧卡 */
    for(let it=0;it<14;it++){ const mid=(lo+hi)/2; (fit(mid).up&&fit(mid).dn)?hi=mid:lo=mid; }
  }
  const t=hi;
  const size=d=>d===0?s0:s0*STRIP.SCALE[Math.min(d,3)]*t;
  const gapF=gap0*t;
  /* 从中心向两侧累加槽位偏移（必须全长初始化，否则 focus>0 时读 undefined 得 NaN） */
  const off=strips.map(()=>0);
  for(let i=stripFocus+1;i<strips.length;i++) off[i]=off[i-1]+(size(i-stripFocus-1)+size(i-stripFocus))/2+gapF;
  for(let i=stripFocus-1;i>=0;i--) off[i]=off[i+1]-((size(stripFocus-1-i)+size(stripFocus-i))/2+gapF);
  strips.forEach((st,i)=>{
    const d=i-stripFocus, ad=Math.abs(d);
    const sz=size(ad);
    st.style.width=sz.toFixed(1)+'px';
    st.style.height=sz.toFixed(1)+'px';
    st.style.transform='translate(-50%,'+((cY+off[i])-sz/2).toFixed(1)+'px)';
    st.style.zIndex=String(100-ad*10);
    st.classList.toggle('ctr',ad===0);
    st.classList.toggle('far',ad>=2);   /* 远处小卡只留封面 */
  });
}
/* 滚轮滑动：展开态下整页任意位置滚动都能让卡片列滑动（页面本身不滚动，不冲突） */
let wheelLock=0;
addEventListener('wheel',e=>{
  if(W<900||stripDeck.classList.contains('shut')) return;
  e.preventDefault();
  const now=Date.now(); if(now-wheelLock<180) return; wheelLock=now;
  const d=e.deltaY>0?1:-1;
  const nf=Math.max(0,Math.min(CHAPTERS.length-1,stripFocus+d));
  if(nf!==stripFocus){ stripFocus=nf; layoutStrips(); }
},{passive:false});
/* ═══ 窄屏手势（对标音乐App双页 + 页码点）：左右滑=唱机页 ↔ 详情页 ═══ */
let gX0=0,gY0=0,gT0=0,gOn=false;
addEventListener('touchstart',e=>{
  if(W>=900) return;
  if(e.target.closest&&e.target.closest('.strip-deck,.player,.topbar,.m-enter,.arch-back')) return;
  const t=e.touches[0]; gX0=t.clientX; gY0=t.clientY; gT0=Date.now(); gOn=true;
},{passive:true});
addEventListener('touchend',e=>{
  if(!gOn) return; gOn=false;
  if(W>=900) return;
  const t=e.changedTouches[0];
  const dx=t.clientX-gX0, dy=t.clientY-gY0, dt=Date.now()-gT0;
  if(dt>700) return;
  const ax=Math.abs(dx), ay=Math.abs(dy);
  const reading=document.body.classList.contains('reading');
  if(ax>64&&ax>ay*1.5){                                  /* 左右滑：翻页（唯一手势，符合大众习惯） */
    if(reading){ if(dx>0) closeArchive(); }              /* 详情页右滑返回唱机 */
    else if(dx<0){ openArchive(); }                      /* 唱机页左滑进详情 */
  }
},{passive:true});
/* ═══════════ 封套下方极简播放器 + 卡环按需展开 ═══════════
   默认画面 = 封套 + 半滑出黑胶 + 胶囊入口 + 这条细播放器（章节卡环整组收起，
   背景完整露出，以美为主）；列表键（hover 或点击）唤出六张章节卡组成的圆环，
   点击列表键可锁定常显，鼠标离开卡环自动收回。 */
const ICON_VOL='M3 9v6h4l5 5V4L7 9H3zm13.6 3a4.6 4.6 0 0 0-2.6-4.15v8.3A4.6 4.6 0 0 0 16.6 12zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z';
const ICON_MUTE='M3 9v6h4l5 5V4L7 9H3zm18.4 3-2.4-2.4-2.4 2.4-1.5-1.5 2.4-2.4-2.4-2.4 1.5-1.5 2.4 2.4 2.4-2.4 1.5 1.5-2.4 2.4 2.4 2.4z';
let deckLock=false, deckTimer=null;
function setDeck(open){
  stripDeck.classList.toggle('shut',!open);
  document.body.classList.toggle('deck-open',open);
  const bl=$('btnList'); if(bl) bl.classList.toggle('on',open);
  if(open){ stripFocus=cur; layoutStrips(); }   /* 展开：当前章滑到中心 */
}
function deckHide(){ if(deckLock) return; clearTimeout(deckTimer); deckTimer=setTimeout(()=>setDeck(false),700); }  /* v99: 420->700ms 宽限 */
(function bindPlayer(){
  const elPlay=$('btnPlay'), elPrev=$('btnPrev'), elNext=$('btnNext'), elMute=$('btnMute');
  const elSeek=$('seek'), elList=$('btnList'), elEnter=$('btnEnter');
  function togglePlay(){
    if(!audio.src) loadTrack(true);
    else if(audio.paused){
      playingIntent=true;
      /* 数据未就绪时 play() 会被拦截；等 loadeddata 再试一次，避免点播放键无反应 */
      const pr=audio.play();
      if(pr&&pr.catch) pr.catch(()=>{
        if(audio.readyState<3) audio.addEventListener('loadeddata', function retry(){ audio.play().catch(()=>{}); audio.removeEventListener('loadeddata', retry); }, {once:true});
      });
    }
    else { playingIntent=false; audio.pause(); }
  }
  if(elPlay) elPlay.addEventListener('click',togglePlay);
  if(elPrev) elPrev.addEventListener('click',()=>stepTo(-1));
  if(elNext) elNext.addEventListener('click',()=>stepTo(1));
  if(elMute) elMute.addEventListener('click',()=>{
    audio.muted=!audio.muted;
    const p=$('volIcon'); if(p) p.setAttribute('d',audio.muted?ICON_MUTE:ICON_VOL);
  });
  if(elSeek) elSeek.addEventListener('input',()=>{
    if(!audio.duration) return;
    const r=+elSeek.value/1000;
    audio.currentTime=r*audio.duration;
    elSeek.style.setProperty('--fill',(r*100).toFixed(2)+'%');
    const tc=$('tCur'); if(tc) tc.textContent=fmt(audio.currentTime);
  });
  if(elEnter) elEnter.addEventListener('click',openArchive);
  const elMEnter=$('mEnter'); if(elMEnter) elMEnter.addEventListener('click',openArchive);   /* 窄屏入口 */
  const elNp=$('npEnter'); if(elNp) elNp.addEventListener('click',openArchive);   /* 窄屏播放面板入口 */
  if(elList){
    elList.addEventListener('click',()=>{ deckLock=!deckLock; clearTimeout(deckTimer); setDeck(deckLock); });
    elList.addEventListener('mouseenter',()=>{ if(W<900) return; clearTimeout(deckTimer); if(!deckLock) setDeck(true); });
    elList.addEventListener('mouseleave',()=>{ if(!deckLock){ clearTimeout(deckTimer); deckTimer=setTimeout(()=>setDeck(false),800); } });
  }
  if(stripDeck){
    stripDeck.addEventListener('mouseenter',()=>clearTimeout(deckTimer));
    stripDeck.addEventListener('mouseleave',deckHide);
  }
  /* 窄屏底部条带：鼠标滚轮 / 按住拖拽 也能横向翻看（触屏原生可滑） */
  if(stripDeck){
    stripDeck.addEventListener('wheel',e=>{
      if(W>=900) return;
      if(Math.abs(e.deltaY)<=Math.abs(e.deltaX)) return;
      e.preventDefault();
      stripDeck.scrollLeft+=e.deltaY;
    },{passive:false});
    let dragX=0,dragL=0,dragging=false,dragMoved=false;
    stripDeck.addEventListener('mousedown',e=>{dragging=true;dragMoved=false;dragX=e.clientX;dragL=stripDeck.scrollLeft;});
    addEventListener('mousemove',e=>{
      if(!dragging) return;
      const dx=e.clientX-dragX;
      if(Math.abs(dx)>6) dragMoved=true;
      if(dragMoved) stripDeck.scrollLeft=dragL-dx;
    });
    addEventListener('mouseup',()=>{ if(dragging){ dragging=false; setTimeout(()=>{dragMoved=false;},0); } });
    stripDeck.addEventListener('click',e=>{ if(dragMoved){ e.stopPropagation(); e.preventDefault(); } },true);
  }
  /* v85：deck 弹带触发改绑收窄区 .mc-hotzone（封面左侧 54%）——封面=选专辑，
     封面右缘到黑胶之间留出安静通道，鼠标去点黑胶入口不再误触弹带。
     packHold：点中心卡收回后触发区恰好在鼠标下方重现，Chrome 会补发 mouseenter
     导致刚收回又弹开 —— 鼠标真正移动过一次之前不再感应 */
  let packHold=false;
  addEventListener('mousemove',()=>{ packHold=false; },{passive:true});
  const elSleeve=document.querySelector('.mc-hotzone');
  if(elSleeve) elSleeve.addEventListener('mouseenter',()=>{
    if(W<900||packHold) return;
    clearTimeout(deckTimer);
    if(!deckLock && stripDeck.classList.contains('shut')) setDeck(true);
  });
  /* 黑胶=章节入口：点击进入内页（v71） */
  const elVinyl=$('mcVinyl');
  if(elVinyl){
    elVinyl.addEventListener('click',openArchive);
    elVinyl.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openArchive(); } });
    /* v73：hover 唱片时圆标让位（圆标在封套层，CSS 够不着，用 body class 联动） */
    elVinyl.addEventListener('mouseenter',()=>document.body.classList.add('vinyl-hot'));
    elVinyl.addEventListener('mouseleave',()=>document.body.classList.remove('vinyl-hot'));
    elVinyl.addEventListener('focus',()=>document.body.classList.add('vinyl-hot'));
    elVinyl.addEventListener('blur',()=>document.body.classList.remove('vinyl-hot'));
  }
  strips.forEach(st=>st.addEventListener('click',()=>{
    if(st===stripDeck.querySelector('.strip.ctr')){ packHold=true; setTimeout(()=>{packHold=false;},800); }
  }));
})();
addEventListener('resize',layoutStrips);
layoutStrips();
setDeck(false);                   /* 默认：条带收起，画面只留封套（以美为主） */

let swapTimer=null;
function setChapter(i,opts){
  opts=opts||{};
  if(i===cur&&!opts.force){
    if(opts.autoplay&&(audio.paused||!audio.src)){ loadTrack(true); }
    return;
  }
  cur=i;
  const ch=CHAPTERS[i];
  stripFocus=i; layoutStrips();   /* 条带列滑动：该章滑到中心放大 */
  if(!reduced){
    document.body.classList.remove('pulse'); void document.body.offsetWidth;
    document.body.classList.add('pulse');
    clearTimeout(setChapter._pulseT);
    setChapter._pulseT=setTimeout(()=>document.body.classList.remove('pulse'),760);
  }
  setTheme(ch.color,ch.aurora);
  /* 封面交换动画：旧图上浮淡出 → 换图 → 新图下入 */
  clearTimeout(swapTimer);
  if(reduced){
    discImg.style.backgroundImage="url('"+ch.cover+"')";
    dcTrack.textContent=ch.track; dcLabel.textContent=ch.label; dcSub.textContent=ch.sub;
  }else{
    discWrap.classList.remove('swap-in');
    discWrap.classList.add('swap-out');
    swapTimer=setTimeout(()=>{
      discImg.style.backgroundImage="url('"+ch.cover+"')";
      dcTrack.textContent=ch.track; dcLabel.textContent=ch.label; dcSub.textContent=ch.sub;
      discWrap.classList.remove('swap-out');
      discWrap.classList.add('swap-in');
    },380);
  }
  loadTrack(!!opts.autoplay);
  mcSetCover(ch.cover);
  const sl=$('mcSleeve'); if(sl) sl.style.backgroundImage="url('"+ch.cover+"')";
  const ct=$('mcCoverName'); if(ct) ct.textContent=ch.label;   /* v85：封面左下角章节中文名 */
  const ct2=$('mcCoverTrack'); if(ct2) ct2.textContent=ch.track; /* v94：贴纸上加 TRACK 号 */
  /* v95：字色按封面左下明暗适配（Python 预量：education/skills 亮底用深字） */
  if(ct){ const ink={'education':'#0d6b55','skills':'#26241f'}; const light={'education':1,'skills':1}[ch.id]; ct.style.color=ct2.style.color=(ink[ch.id]||(light?'#26241f':'#fff'));
          ct.style.textShadow=ct2.style.textShadow=(ch.id==='education')?'none':(light?'0 1px 4px rgba(255,255,255,.4)':'0 1px 10px rgba(0,0,0,.55)'); }
  /* v73：黑胶按章节色卡染色——变量挂在 .mini-case 上，黑胶/圆标/标签统一继承 */
  const mc=$('miniCase');
  if(mc){
    mc.style.setProperty('--vinyl-acc',ch.color);
    mc.style.setProperty('--vinyl-glow',hexRGBA(ch.color,.5));
    mc.style.setProperty('--vinyl-tint',hexRGBA(ch.color,.16));
  }
  const el=$('enterLabel'); if(el) el.textContent=ch.label;   /* 胶囊入口跟着章节名 */
  const mel=$('mEnterLabel'); if(mel) mel.textContent=ch.label;   /* 窄屏进入按钮同步章节名 */
  const nt=$('npTrack'); if(nt) nt.textContent=ch.track;   /* 窄屏播放面板：章节号 */
  const nn=$('npName'); if(nn) nn.textContent=ch.label;    /* 窄屏播放面板：章节名 */
  /* 海报排版层（v60）：按 big 数组动态生成 2~3 行，绕封套上/右/下流动（参考图多行交错） */
  const pr=$('ptRows');
  if(pr){
    pr.innerHTML='';
    (ch.big&&ch.big.length?ch.big:[ch.sub.toUpperCase()]).forEach((w,i)=>{
      const d=document.createElement('div');
      const pos=(ch.bigPos&&ch.bigPos[i])||('p'+Math.min(i,2));
      d.className='pt-row pt-'+pos;
      d.textContent=w;
      pr.appendChild(d);
    });
  }
  const pt=$('ptTrack'); if(pt) pt.textContent=ch.track;
  archBgFor(ch);
  if(archive.classList.contains('on')) renderArch();   /* 正文页开着时切章：整页重渲染 */
}
discWrap.addEventListener('animationend',e=>{ if(e.animationName==='swapIn') discWrap.classList.remove('swap-in'); });

/* ═══════════ 归档视图（简历正文） ═══════════ */
/* 轻量 Markdown 渲染：标题 / 粗体 / 行内代码 / 列表 / 表格 / 分隔线 */
function mdToHtml(md){
  /* 去掉 frontmatter（--- ... ---） */
  md = md.replace(/^---\n[\s\S]*?\n---\n/, '');
  var lines=md.split('\n'), out=[], inUl=false, inOl=false, inTable=false;
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function inline(s){
    s=esc(s);
    s=s.replace(/`([^`]+)`/g,'<code>$1</code>');
    s=s.replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
    return s;
  }
  function closeLists(){ if(inUl){out.push('</ul>');inUl=false;} if(inOl){out.push('</ol>');inOl=false;} }
  function closeTable(){ if(inTable){out.push('</tbody></table>');inTable=false;} }
  for(var i=0;i<lines.length;i++){
    var ln=lines[i];
    if(/^\s*$/.test(ln)){ closeLists(); closeTable(); continue; }
    var h=ln.match(/^(#{1,4})\s+(.*)$/);
    if(h){ closeLists(); closeTable(); out.push('<div class="mdh mdh'+h[1].length+'">'+inline(h[2])+'</div>'); continue; }
    if(/^---+\s*$/.test(ln)){ closeLists(); closeTable(); out.push('<hr class="mdhr">'); continue; }
    if(/^\|/.test(ln)){
      closeLists();
      var cells=ln.replace(/^\|/,'').replace(/\|\s*$/,'').split('|').map(function(c){return c.trim();});
      if(cells.every(function(c){return /^:?-+:?$/.test(c);})){ continue; }
      if(!inTable){
        out.push('<table class="mdtable"><thead><tr>'+cells.map(function(c){return '<th>'+inline(c)+'</th>';}).join('')+'</tr></thead><tbody>');
        inTable=true;
      }else{
        out.push('<tr>'+cells.map(function(c){return '<td>'+inline(c)+'</td>';}).join('')+'</tr>');
      }
      continue;
    }
    var ul=ln.match(/^-\s+(.*)$/);
    if(ul){ closeTable(); if(!inUl){ closeLists(); out.push('<ul class="mdlist">'); inUl=true; } out.push('<li>'+inline(ul[1])+'</li>'); continue; }
    var ol=ln.match(/^\d+\.\s+(.*)$/);
    if(ol){ closeTable(); if(!inOl){ closeLists(); out.push('<ol class="mdlist">'); inOl=true; } out.push('<li>'+inline(ol[1])+'</li>'); continue; }
    closeLists(); closeTable(); out.push('<p class="mdp">'+inline(ln)+'</p>');
  }
  closeLists(); closeTable();
  return out.join('');
}
/* 内嵌文档：全文平铺展开，无需点击附件、无内滚小窗，随正文直接阅读（可折叠） */
function mdViewer(key){
  var d=(window.MD_DOCS||{})[key];
  if(!d) return '';
  return '<details class="a-mdwrap" open><summary class="a-mdhead"><span>'+d.title+'</span><em>全文内嵌 · 点击折叠</em></summary>'+
         '<div class="a-md">'+mdToHtml(d.content)+'</div>'+
         (d.file?'<div class="a-mdfoot"><a href="'+d.file+'" download>下载原文件 '+d.title+'</a></div>':'')+
         '</details>';
}
/* AI 视频位：文件未就位时自动降级为占位卡；视频放到 assets/aivideos/ 即自动显示 */
window.vidPh=function(v){var d=document.createElement('div');d.className='a-vidph';d.textContent='待放置 · '+(v.dataset.cap||'AI 视频');v.replaceWith(d);};
function aiVideo(src,cap){return '<div class="a-figure"><video class="a-video" controls preload="metadata" src="'+src+'" data-cap="'+cap+'" onerror="vidPh(this)"></video><p class="a-cap">'+cap+'</p></div>';}
const ARCH={
hero:'<section class="arch-sec" id="a-hero">'+
  '<p class="arch-no">Track 01 · Profile</p><h2 class="arch-title">黄奕铭</h2><p class="arch-sub">Huang Yiming · AI 产品经理实习生</p><div class="arch-rule"></div>'+
  '<div class="a-card"><span class="a-badge">Contact · 联系方式</span><h3 class="a-h3">黄奕铭</h3>'+
  '<p class="a-meta">AI 产品经理实习生</p>'+
  '<div class="arch-contact"><a href="tel:18874222139">tel：18874222139</a><a href="mailto:hymxiaoming@163.com">hymxiaoming@163.com</a></div></div>'+
  '<div class="a-card"><span class="a-badge">Education · 教育背景</span><h3 class="a-h3">东南大学</h3>'+
  '<p class="a-meta">建筑学院 · 风景园林 / 硕士 · 985 · 双一流</p><p class="a-year">2025.09 — 至今 · 2025–2026 学业一等奖学金</p></div>'+
  '<div class="a-card"><span class="a-badge">Education · 教育背景</span><h3 class="a-h3">东北林业大学</h3>'+
  '<p class="a-meta">园林学院 · 风景园林 / 本科 · 211 · 双一流</p><p class="a-year">2020.09 — 2024.06 · 2021–2022 校级优秀学生干部 · 三好学生</p></div>'+
  '<div class="a-card"><span class="a-badge">Life · 生活与爱好</span>'+
  '<div class="a-tags"><i class="a-tag">唱歌</i><i class="a-tag">游戏</i><i class="a-tag">羽毛球</i><i class="a-tag">骑行</i><i class="a-tag">小动物</i></div></div></section>',
advantages:'<section class="arch-sec" id="a-advantages">'+
  '<p class="arch-no">Track 02 · Prelude</p><h2 class="arch-title">个人优势</h2><p class="arch-sub">Advantages · Synopsis</p><div class="arch-rule"></div>'+
  '<div class="a-card"><span class="a-badge">01 · AI 工程能力</span>'+
  '<p>擅长 <b>Multi-Agent 架构与 Agentic Workflow 编排、MCP 工具接入、RAG 与知识库构建（向量检索 + 重排）、大模型微调（SFT / LoRA）与评估（LLM-as-a-Judge）、Prompt 工程与上下文工程、评测数据集构建</b>，具备从模型选型到落地调优的完整实践经验。</p></div>'+
  '<div class="a-card"><span class="a-badge">02 · 项目实践</span>'+
  '<p>具有 AI 相关场景的项目产品实践经验，深度参与电商智能选品项目，涵盖<b>从模型选型 → 数据集构建 → 大模型评估 → 微调迭代</b>的完整闭环。</p></div>'+
  '<div class="a-card"><span class="a-badge">03 · 编程与 AI Coding</span>'+
  '<p>熟练掌握 <b>Python、SQL</b>，具有一定的编程能力；熟练使用 <b>Claude Code / Cursor</b> 等 AI 编程工具进行 Vibe Coding、Coze、Dify 等低代码 Agent 搭建工具。能够通过 Vibe Coding 完成<b>应用 demo 的搭建与部署</b>，理解前后端架构、API 设计、容器化部署等技术方案，可与 RD 高效对齐需求。</p></div>'+
  '<div class="a-card"><span class="a-badge">04 · 工作方式</span>'+
  '<p><b>善于学习、抗压能力强</b>，能快速上手新领域，适应快节奏、多任务并行的工作方式。自驱力强，习惯<b>主动拆解问题、推动落地</b>，对交付质量有要求。</p></div></section>',
featureRail:'<section class="arch-sec" id="a-featureRail">'+
  '<p class="arch-no">Feature · Featurette</p><h2 class="arch-title">项目细节 · 智能选品项目</h2><p class="arch-sub">Multi-Agent 电商智能选品 · 四卷</p><div class="arch-rule"></div>'+
  '<div class="a-card"><span class="a-badge">01 · 项目背景</span><h3 class="a-h3">智能选品项目背景</h3>'+
  '<p><b>要解决的问题：</b>选品是中小商家经营里决策成本最高、最依赖经验、试错最贵的环节，但他们普遍缺专业品类研判力。而当前选品工具多以「销量榜 + 条件筛选」为主，难以回答品类的关键问题——<b>商品与市场的可投入性、目标受众与适销场景、以及上架后的经营风险</b>。</p>'+
  '<p><b>产品定位：</b>做<b>「通用选品底座 + 食品垂直专精层」</b>——食品是作为选择的第一个深耕切入口：它的合规/冷链/风味等专业维度最深、风险最高、且通用工具最薄弱，最适合用 AI 建立差异化；底座通用，其他品类可后续按同框架扩展。</p>'+
  '<p><b>差异化：</b>与竞品相比，差异集中在两点——其一，<b>落地决策</b>：输出「具体 SKU + 价格 + 数量 + 依据」的可执行结论，而非一份分析；其二，<b>食品选品专精</b>：将合规、冷链、风味等通用工具难以处理的食品维度做深，使缺乏经验的中小商家也能获得可执行的选品结论。</p></div>'+
  '<div class="a-card"><span class="a-badge">02 · Agent 架构</span><h3 class="a-h3">Multi-Agent 架构</h3>'+
  '<p><b>澄清 Agent「模糊自然语言 → 结构化选品指令」</b>：识别意图（一级 + 二级）、补齐缺失字段（F1 平台地区 / F2 类目 / F3 诉求 / F4 商家信息）、口语映射、最多 3 轮反问、问不清就兜底。</p>'+
  '<p><b>规划 Agent「结构化指令 → 执行计划」</b>：选品要调哪些 Skill / 工具、按什么顺序、每步产出什么中间结果，同时负责查收研究 Agent 结果，若不符合则打回重做。</p>'+
  '<p><b>研究 Agent「执行计划 → 数据 + 中间结论」</b>：调用 websearch / SQL / RAG / 计算 / 风险评估等工具拿数据、算指标、留痕（可回看过程）。</p>'+
  '<p><b>报告 Agent「数据结论 → 结构化选品报告」</b>：按模块大纲把结果写成可落地的选品报告，渲染图表 + 组货清单 + 运营 SOP。</p>'+
  '<div class="a-figure"><svg viewBox="0 0 460 560" role="img" aria-label="Multi-Agent 选品流程图">'+
  '<defs><marker id="afArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#5a6b80"/></marker></defs>'+
  '<g fill="none" stroke="#5a6b80" stroke-width="1.6">'+
  '<line x1="230" y1="66" x2="230" y2="98" marker-end="url(#afArrow)"/>'+
  '<line x1="230" y1="146" x2="230" y2="178" marker-end="url(#afArrow)"/>'+
  '<line x1="230" y1="226" x2="230" y2="258" marker-end="url(#afArrow)"/>'+
  '<line x1="204" y1="306" x2="152" y2="352" marker-end="url(#afArrow)"/>'+
  '<line x1="256" y1="306" x2="308" y2="352" marker-end="url(#afArrow)"/>'+
  '<path d="M350 400 C350 448 350 496 306 496" marker-end="url(#afArrow)"/>'+
  '<path d="M40 378 C12 378 12 284 146 284" stroke-dasharray="5 5" marker-end="url(#afArrow)"/>'+
  '</g>'+
  '<g font-size="13.5" font-weight="600" text-anchor="middle">'+
  '<g><rect x="150" y="22" width="160" height="44" rx="10" fill="#eef2f8" stroke="#93a5bd"/><text x="230" y="49" fill="#1d2a3a">用户 query</text></g>'+
  '<g><rect x="150" y="102" width="160" height="44" rx="10" fill="#eef2f8" stroke="#93a5bd"/><text x="230" y="129" fill="#1d2a3a">意图识别</text></g>'+
  '<g><rect x="150" y="182" width="160" height="44" rx="10" fill="#dfe9f4" stroke="#5f7ba0"/><text x="230" y="209" fill="#16283f">澄清 Agent</text></g>'+
  '<g><rect x="150" y="262" width="160" height="44" rx="10" fill="#dfe9f4" stroke="#5f7ba0"/><text x="230" y="289" fill="#16283f">规划 Agent</text></g>'+
  '<g><rect x="40" y="356" width="140" height="44" rx="10" fill="#dfe9f4" stroke="#5f7ba0"/><text x="110" y="383" fill="#16283f">研究 Agent</text></g>'+
  '<g><rect x="280" y="356" width="140" height="44" rx="10" fill="#dfe9f4" stroke="#5f7ba0"/><text x="350" y="383" fill="#16283f">报告 Agent</text></g>'+
  '<g><rect x="160" y="474" width="140" height="44" rx="10" fill="#eef2f8" stroke="#93a5bd"/><text x="230" y="501" fill="#1d2a3a">用户</text></g>'+
  '</g>'+
  '<text x="86" y="332" font-size="10.5" text-anchor="middle" fill="#8a97a8">不符合 · 打回重做</text>'+
  '<text x="372" y="452" font-size="10.5" text-anchor="start" fill="#8a97a8">结构化选品报告</text>'+
  '</svg><p class="a-cap">图：Multi-Agent 选品流程（研究 Agent 结果不达标 → 虚线打回规划 Agent 重做；报告 Agent 直出报告给用户）</p></div></div>'+
  '<div class="a-card"><span class="a-badge">03 · 意图&amp;澄清</span><h3 class="a-h3">意图识别与澄清设计</h3>'+
  '<p><b>核心原则：先定意图，澄清跟着意图走。</b>决策链：<b>有关/无关 → 品类明确度 → 一级意图 → 诉求（二级意图）→ 差异化澄清</b>。不同意图缺失的字段不同，问的顺序和内容也不同——不存在一套固定不变的澄清模板。</p>'+
  '<p><b>意图识别分三层</b>：① 有关/无关——判断输入能否映射到 A1–B5 十种策略之一，无关不硬拒、引导回选品；② 品类明确度 → 一级意图——无品类=全新赛道、一级大类=半明确先下钻、二级小类/三级细分=深耕拓品、具体商品=深耕聚焦，判定标准是「能不能直接进入选品运算」；③ 诉求（二级意图）→ 差异化澄清。</p>'+
  '<p><b>澄清四维字段</b>：F1 平台地区（免弹卡，对话优先）、F2 下钻等结构场景弹卡、F3 未提时弹（必弹）、F4 答不全弹——多数对话 0 张卡，仅 F2 下钻等结构场景弹卡，默认选项卡片策略兜底收敛模糊需求。</p>'+
  '<div class="a-figure"><img src="assets/feat/03-intent.png" alt="选品澄清卡片样式案例" loading="lazy"><p class="a-cap">图：选品澄清卡片 · 样式案例（对话优先，卡片兜底）</p></div>'+
  mdViewer('intent')+'</div>'+
  '<div class="a-card"><span class="a-badge">04 · 策略 Skill</span><h3 class="a-h3">选品策略 Skill</h3>'+
  '<p>将食品选品方法论沉淀为<b>策略型 Skill</b>（product-selection-strategy），与 websearch、SQL、RAG 等数据型 Skill 统一编排：</p>'+
  '<div class="a-figure"><pre class="a-tree">product-selection-strategy/\n├── SKILL.md\n└── references/\n    ├── four-dimensions.md        宏观市场 · 微观商品 · 内因外因四维\n    ├── dimension-focus.md        按意图 × 诉求的重点考察矩阵\n    └── food-vertical.md          食品垂直 6 大类目差异化规则与合规校验</pre></div>'+
  mdViewer('skill')+
  '<p>Skill 内定义<b>触发条件、调用优先级与失败降级路径</b>；输出侧按意图 × 诉求衍生 10 套章节模板，再按 6 大食品类目增删挂载专属研判维度与合规校验。</p></div>'+
  '<div class="a-card"><span class="a-badge">05 · 四维研判</span><h3 class="a-h3">四维研判框架</h3>'+
  '<p>选品研判的底层框架：<b>宏观市场 · 微观商品 · 内因 · 外因</b>——先判断赛道值不值得进，再看商品本身能不能打，最后落到商家自身能力与外部环境变量。</p>'+
  mdViewer('fourdim')+'</div>'+
  '<div class="a-card"><span class="a-badge">06 · 考察矩阵</span><h3 class="a-h3">按意图 × 诉求的重点考察矩阵</h3>'+
  '<p>不同意图下「哪些维度重点考察、哪些只做基础检查」并不相同：按<b>一级意图 × 诉求</b>给出重点考察矩阵，避免十个维度平均用力、结论发散。</p>'+
  mdViewer('dimfocus')+'</div>'+
  '<div class="a-card"><span class="a-badge">07 · 食品垂直</span><h3 class="a-h3">食品垂直专精层</h3>'+
  '<p>食品是第一个深耕切入口：按<b> 6 大类目</b>挂载各自的差异化研判维度与<b>合规校验</b>（资质、标签、保质期与冷链等），把通用工具处理不了的专业维度做深。</p>'+
  mdViewer('foodvert')+'</div></section>',
experience:'<section class="arch-sec" id="a-experience">'+
  '<p class="arch-no">Track 04 · Movement II</p><h2 class="arch-title">实习经历</h2><p class="arch-sub">Experience · Internship</p><div class="arch-rule"></div>'+
  '<div class="a-card"><span class="a-badge">AI 产品经理实习生 · 2025.03 — 2025.07</span><h3 class="a-h3">虾皮 Shopee · 基于 Multi-Agent 的电商智能选品项目</h3>'+
  '<p style="margin-bottom:14px">参与虾皮 Shopee AI 智能选品产品设计工作，构建<b>「Multi-Agent」</b>的智能选品体系，解决传统选品时效低、数据海量难处理的难题，实现商家选品降本增效提升。</p><ul>'+
  '<li><p><b>业务调研</b>：深入调研遨虾、LinkFox、Eco Tik 等竞品智能选品的产品方案和技术路线，生成调研报告；结合自身业务场景需求，提出<b>「Multi-Agent」</b>的智能选品产品方案设计。</p></li>'+
  '<li><p><b>智能选品 Agent 设计</b>：根据<b>「专业选品师选品经验」</b>结合<b>「Multi-Agent」</b>技术设计涵盖<b>澄清、规划、研究、报告四个 Agent</b> 的多智能体架构。设计<b>「输入—过程—输出」微观机制</b>——澄清侧通过<b>「需求 / 品类 / 市场 / 商家信息」</b>四维缺失识别 + 3 轮反问上限 + 默认选项卡片策略兜底，收敛模糊选品需求；能力侧将食品选品方法论<b>「宏观市场、微观商品、内因外因四维 + 食品垂直领域 6 大类目差异化选品规则与合规校验沉淀」</b>为策略型 Skill，与 websearch、SQL、RAG 等数据型 Skill 统一编排，定义触发条件、调用优先级与失败降级路径；输出侧设计选品报告大纲：以五模块<b>「市场概览、竞争格局、人群/属性筛选、推荐商品与理由、风险与运营 SOP」</b>，按意图 × 诉求衍生 10 套章节模板，再按 6 大食品类目增删挂载专属研判维度与合规校验。</p></li>'+
  '<li><p><b>Agent 评测</b>：主导智能选品 Agent 生成报告结果层可行性效果评测与优化工作，<b>从 0 构建 1 套完整的模型评价体系</b>，设计<b>「完整性、数据可信度、逻辑自洽、推荐质量、决策价值」5 维度 26 项指标</b>的评测体系，3 轮评测定位<b>落地执行策略不足、商品推荐不佳</b>两大核心痛点，针对性制定优化策略，采取大模型微调与 Prompt 工程优化，推动 Agent 迭代升级。</p></li>'+
  '<li><p><b>模型调优</b>：基于已建立的评测闭环（评测集 + 人工标注 + Bad Case 库），参与 AI 选品 Agent 的模型调优：通过评测归因定位<b>推理不透明、推荐同质化、结论落地性低</b>等 11 类典型问题，通过 <b>Prompt 工程约束、工程多路召回</b>等手段迭代优化选品报告质量，形成<b>「评测—调优—再评测」</b>可持续迭代机制；意图识别准确率提升 <b>11%（81% → 92%）</b>，商品推荐质量提升 <b>15%（80% → 95%）</b>。</p></li>'+
  '<li><p><b>工作成果</b>：商家测试中，AI 智能选品<b>采纳率上升 30%</b>，平均帮助每个企业<b>降低 40% 人力成本</b>；AI 满意度 ≥ 75%，差评占比 &lt; 25%。</p></li></ul>'+
  '<div class="a-stats">'+
  '<div class="a-stat"><b>+11%</b><em>意图识别准确率</em><span>81% → 92%</span></div>'+
  '<div class="a-stat"><b>+15%</b><em>商品推荐质量</em><span>80% → 95%</span></div>'+
  '<div class="a-stat"><b>+30%</b><em>AI 选品采纳率</em><span>商家测试</span></div>'+
  '<div class="a-stat"><b>−40%</b><em>企业人力成本</em><span>满意度 ≥ 75%</span></div>'+
  '</div></div></section>',
education:'<section class="arch-sec" id="a-education">'+
  '<p class="arch-no">Track 03 · Fragments</p><h2 class="arch-title">AI 碎片</h2><p class="arch-sub">AI Videos &amp; Product Thoughts</p><div class="arch-rule"></div>'+
  '<div class="a-card"><span class="a-badge">01 · AI 视频</span><h3 class="a-h3">我做的 AI 视频</h3>'+
  '<p>用 AI 完成从分镜、生成到剪辑的短片创作——把生成工具玩出风格，也建立对模型能力边界的体感。</p>'+
  aiVideo('assets/aivideos/01.mp4','AI 视频 · 分镜到成片')+
  '</div>'+
  '<div class="a-card"><span class="a-badge">02 · AI 产品思考</span><h3 class="a-h3">AI 产品思考</h3>'+
  '<p><b>先定义不可接受的错误，再规划能力边界：</b>AI 产品的风险不在「答得不够好」，而在「答错却没有人兜住」。产品设计的第一件事，是把场景里的错误按后果分级——合规、金额、承诺类错误一旦发生就不可逆，必须靠硬性规则拦截或转人工审核，而不是寄希望于模型「再训得好一点」。先把这一层底线立住，再往上叠加生成、推理等能力，产品才敢交付给真实用户。</p>'+
  '<p><b>评测先行，先于调优：</b>模型调优是整条链路里成本最高、也最慢的环节，一旦前置，很容易陷入「调了——不知道有没有用——再调」的循环。正确顺序是先用评测体系把「好用」拆成可量化的指标，再逐层定位问题出在意图理解、数据检索还是生成质量，最后才针对性地决定调什么、值不值得调。<b>没有评测闭环的优化，本质是凭经验试错</b>。</p>'+
  '<p><b>过程可解释，比结果炫技更重要：</b>单看一个「漂亮」的最终答案，无法判断它是推理对了还是碰巧蒙对。Multi-Agent 的价值不在架构本身，而在每一步都可验证——调用了什么工具、取了什么数据、中间结论是什么全程留痕、可回溯，结果不达标可以被定位到具体环节并打回重做。面向对错误敏感的用户，<b>可信的来源是可追溯，而不是话术包装</b>。</p>'+
  '<p><b>按复杂度选择 Agent 还是单一流程：</b>Multi-Agent 不是能力的标配，而是一种有代价的架构选择——每多一层编排，就多一层的推理损耗、延迟和不确定性累积。简单、路径确定的任务，用一条经过反复调校的 Prompt 往往比拆 Agent 更稳、更快；只有需要多步推理、多工具协同、且中间结果需要独立审查的场景，才值得付出编排成本去拆 Agent。判断标准是：<b>拆开之后每一步是否真的可独立验证、可独立优化</b>。</p>'+
  '<p><b>模型的能力边界，决定了产品体验的上限：</b>与其期望模型通晓一切，不如把能力限制设计成产品的确定性。产品上要明确三件事：它在什么条件下可能失准、什么情况下应当直接拒绝作答、什么情况下应当把判断交还用户而不是替用户做主。<b>把边界说清楚的 AI，比假装无所不能的 AI 更可信</b>。</p></div></section>',
skills:'<section class="arch-sec" id="a-skills">'+
  '<p class="arch-no">Track 05 · Movement III</p><h2 class="arch-title">个人技能</h2><p class="arch-sub">Skills</p><div class="arch-rule"></div>'+
  '<div class="a-card"><span class="a-badge">AI 工程能力</span>'+
  '<div class="a-tags"><i class="a-tag">Agent 搭建</i><i class="a-tag">Multi-Agent</i><i class="a-tag">RAG 设计</i>'+
  '<i class="a-tag">大模型微调与评估</i><i class="a-tag">Prompt 工程</i><i class="a-tag">数据集构建</i></div></div>'+
  '<div class="a-card"><span class="a-badge">AI 工作流</span>'+
  '<div class="a-tags"><i class="a-tag">Coze</i><i class="a-tag">Dify</i><i class="a-tag">ComfyUI</i><i class="a-tag">Vibe-coding</i></div></div>'+
  '<div class="a-card"><span class="a-badge">编程与开发</span>'+
  '<div class="a-tags"><i class="a-tag">Python</i><i class="a-tag">SQL</i><i class="a-tag">Cursor</i><i class="a-tag">Trae</i></div></div></section>'
};
const archive=$('archive'), archBack=$('archBack');
archive.innerHTML=
  '<div class="arch-bg" aria-hidden="true"><i class="arch-bgimg" id="archBg"></i><u class="arch-bgveil"></u></div>'+
  '<div class="arch-inner"><div class="arch-grid">'+
  '<aside class="arch-side"><div class="arch-pack">'+
  '<div class="arch-vinyl" aria-hidden="true"><i class="av-rot"><i class="av-label" id="archDisc"></i></i>'+
  '<i class="av-hole"></i><i class="av-sheen"></i></div>'+
  '</div></aside>'+
  '<div class="arch-main">'+
  '<p class="arch-hugeno" id="archHugeNo"></p>'+
  '<h1 class="arch-huge" id="archHuge"></h1>'+
  '<div class="arch-body" id="archBody"></div>'+
  '</div>'+
  '</div></div>';
/* 正文页背景 = 当前章节专辑封面（轻染色层，主背景是透进来的极光） */
function archBgFor(ch){
  const el=$('archBg'); if(el) el.style.backgroundImage="url('"+ch.cover+"')";
}
/* 详情页只渲染当前章节：左侧黑胶（封面做唱片芯）+ 右侧本章正文 + 右上大标题；无章间跳转 */
function renderArch(){
  const ch=CHAPTERS[cur];
  $('archHugeNo').textContent=ch.track+' · '+ch.sub;
  $('archHuge').textContent=ch.label;
  $('archBody').innerHTML=ARCH[ch.id];
  $('archDisc').style.backgroundImage="url('"+ch.cover+"')";
  archBgFor(ch);
  archive.scrollTop=0;
  bindArchVideos();
}
/* AI 视频 ↔ 背景音乐联动：只有视频开始播放才暂停音乐；
   视频暂停/结束/退出详情页时恢复音乐（若原本就在播）。
   其余操作（切章节、播放键等）不影响这一联动，音乐逻辑各自独立。 */
let _musicBeforeVideo=null;   /* 记录视频播放前音乐是否在播，用于视频结束后恢复 */
function bindArchVideos(){
  archive.querySelectorAll('video.a-video').forEach(v=>{
    if(v._boundMusic) return; v._boundMusic=true;
    v.addEventListener('play',()=>{
      if(!audio.paused){ _musicBeforeVideo=true; audio.pause(); }
      else _musicBeforeVideo=false;
    });
    v.addEventListener('pause',()=>{
      if(_musicBeforeVideo && audio.paused){ audio.play().catch(()=>{}); }
      _musicBeforeVideo=null;
    });
    v.addEventListener('ended',()=>{
      if(_musicBeforeVideo && audio.paused){ audio.play().catch(()=>{}); }
      _musicBeforeVideo=null;
    });
  });
}
function openArchive(){
  archive.classList.add('on'); archBack.classList.add('on');
  document.body.classList.add('reading');           /* 淡出唱机前景，透出极光/星漩背景 */
  document.body.style.overflow='hidden';           /* 锁住底层滚动，避免滚动穿透 */
  renderArch();
}
function closeArchive(){
  /* v98：退出章节时暂停所有内页视频，避免后台继续播 */
  archive.querySelectorAll('video').forEach(v=>{ try{ v.pause(); }catch(_){}});
  archive.classList.remove('on'); archBack.classList.remove('on');
  document.body.classList.remove('reading');
  document.body.style.overflow='';
}
archBack.addEventListener('click',closeArchive);
$('logoHome').addEventListener('click',e=>{ e.preventDefault(); closeArchive(); });
dcLabel.parentElement.parentElement.addEventListener('dblclick',openArchive);

/* 键盘 */
addEventListener('keydown',e=>{
  if(e.key==='Escape') closeArchive();
  if(e.target&&/INPUT|TEXTAREA/.test(e.target.tagName)) return;
  if(e.code==='Space'){   /* v71：空格=纯播放/暂停；进入章节走黑胶入口或 E 键 */
    e.preventDefault();
    if(!audio.src) loadTrack(true);
    else if(audio.paused){
      playingIntent=true;
      const pr=audio.play();
      if(pr&&pr.catch) pr.catch(()=>{
        if(audio.readyState<3) audio.addEventListener('loadeddata', function retry(){ audio.play().catch(()=>{}); audio.removeEventListener('loadeddata', retry); }, {once:true});
      });
    }
    else{ playingIntent=false; audio.pause(); }
  }
  else if(e.key==='ArrowLeft') stepTo(-1);
  else if(e.key==='ArrowRight') stepTo(1);
});

/* 初始章节 */
setChapter(0,{force:true});
})();
