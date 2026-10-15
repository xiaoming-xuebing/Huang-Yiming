// ====================================================
//  3D 唱臂 + 深蓝星体（用户提供的 tonearm-new.glb）
//  与开场 2D 银河画面对齐：可变俯角正交相机，1 世界单位=1CSS像素
//  支持：星体显示/发光、相机俯角过渡（斜角→顶视）、整体右移
// ====================================================
import * as THREE from 'three';
import { SimpleGLTFLoader as GLTFLoader } from './glb-loader.js?v=2';
import { RoomEnvironment } from './three/addons/environments/RoomEnvironment.js';

/* ---- 模型锚点（放平后坐标：geometry.rotateX(-PI/2) 使 (x,y,z)->(x,z,-y)） ---- */
const BEARING = { x: 0.019, z: 0.0 };
const TIP    = { x: -0.068, y: 0.042, z: 0.629 };
const TIP_LEN = 0.572; // 新模型枢轴(圆盘中心)→针尖（本地1.143 × group缩放0.5）
const TIP_PHI = Math.atan2(TIP.z - BEARING.z, TIP.x - BEARING.x); // ≈ 1.708
const FIT = 1.0; // curScale = L3/TIP_LEN：臂尖恰好落在 N 点
const LIFT = 0.05;
let ARM_SHRINK = 0.93;   // 唱臂整体缩小一点（静止/播放同尺寸，仅方位不同）
let REST_DELTA = 0.62;   // 静止态往外拨开的屏幕角度（弧度）：针尖停在右上外圈星轨带
let CUE_K0 = 0.72;       // 摆臂前 72% 抬针水平摆入，末段 28% 降臂落针
// 实时调参接口（浏览器控制台/自动化调试用）
window.__arm3dTune = {
  get ARM_SHRINK(){return ARM_SHRINK}, set ARM_SHRINK(v){ARM_SHRINK=v},
  get REST_DELTA(){return REST_DELTA}, set REST_DELTA(v){REST_DELTA=v},
  get CUE_K0(){return CUE_K0}, set CUE_K0(v){CUE_K0=v},
};

/* ---- 共享状态（由 intro.html 主循环写入） ---- */
const S = window.__arm3dState = {
  W: innerWidth, H: innerHeight, Px: 0, Py: 0, Nx: 0, Ny: 0,
  shown: 0, k: 0, drop: 0, restDelta: 0.62,
  tiltK: 0,        // 0=斜角(sE=.42)  1=顶视(sE≈.98)
  shiftX: 0,       // 整体水平右移像素
  starShown: 0,    // 星体可见度（已移除蓝色星体）
  starGlow: 0,     // 星体发光强度
};

const canvas = document.getElementById('arm3d');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(S.W, S.H, false);
renderer.setClearColor(0x000000, 0); // 确保透明，不遮挡 2D 银河
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.add(new THREE.HemisphereLight(0xbcd2ff, 0x100c08, 0.55));
const key = new THREE.DirectionalLight(0xfff2dc, 1.5); key.position.set(2.2, 4, 2.6); scene.add(key);
const rim = new THREE.DirectionalLight(0x8fb6ff, 0.8); rim.position.set(-3, 1.6, -2.4); scene.add(rim);
const glint = new THREE.PointLight(0xffffff, 12, 0, 1.6); glint.position.set(0, 2.6, 1.4); scene.add(glint);

/* 俯角正交相机：sE 由 tiltK 驱动 */
let sE = 0.42, cE = Math.sqrt(1 - sE * sE);
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
function updateCamera() {
  sE = 0.42 + (0.98 - 0.42) * S.tiltK;
  cE = Math.sqrt(1 - sE * sE);
  camera.position.set(0, sE * 12, cE * 12);
  camera.lookAt(0, 0, 0);
}
updateCamera();

/* ---- 层级：root → align → spin → cue → model ---- */
const root = new THREE.Group(); scene.add(root);
const alignG = new THREE.Group(); root.add(alignG);
const spinG = new THREE.Group(); alignG.add(spinG);
const cueG = new THREE.Group(); spinG.add(cueG);
const modelG = new THREE.Group(); cueG.add(modelG);

/* ---- 深蓝星体 ---- */
const starGroup = new THREE.Group();
scene.add(starGroup);

// 星体表面纹理：程序化深蓝噪声
function makeStarTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(256, 256, 20, 256, 256, 256);
  grd.addColorStop(0, '#1a3a6e');
  grd.addColorStop(.5, '#0f2550');
  grd.addColorStop(1, '#070e24');
  g.fillStyle = grd; g.fillRect(0, 0, 512, 512);
  // 细腻蓝色纹理斑
  for (let i = 0; i < 2600; i++) {
    const x = Math.random() * 512, y = Math.random() * 512;
    const r = Math.random() * 2.5 + .3;
    const b = Math.floor(Math.random() * 70 + 40);
    g.fillStyle = `rgba(${30+b*0.3|0},${80+b*0.6|0},${140+b|0},${Math.random()*0.25+0.05})`;
    g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
  }
  return new THREE.CanvasTexture(c);
}
const starTex = makeStarTexture();
starTex.wrapS = starTex.wrapT = THREE.RepeatWrapping;

const starGeo = new THREE.SphereGeometry(1, 64, 48);
const starMat = new THREE.MeshStandardMaterial({
  map: starTex,
  color: 0x1b3d7a,
  metalness: 0.1,
  roughness: 0.75,
  emissive: 0x0a1a3a,
  emissiveIntensity: 0.4,
});
const star = new THREE.Mesh(starGeo, starMat);
starGroup.add(star);

// 星体边缘光（菲涅尔外壳）
const rimGeo = new THREE.SphereGeometry(1.06, 48, 36);
const rimMat = new THREE.ShaderMaterial({
  transparent: true,
  side: THREE.BackSide,
  uniforms: { uGlow: { value: 0 } },
  vertexShader: `
    varying vec3 vN; varying vec3 vV;
    void main(){
      vN = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position,1.0);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: `
    varying vec3 vN; varying vec3 vV;
    uniform float uGlow;
    void main(){
      float f = pow(1.0 - max(dot(vN,vV),0.0), 2.2);
      vec3 c = mix(vec3(0.25,0.45,0.85), vec3(0.85,0.72,0.42), uGlow);
      gl_FragColor = vec4(c, f * (0.5 + uGlow * 0.7));
    }`,
});
const starRim = new THREE.Mesh(rimGeo, rimMat);
starGroup.add(starRim);

// 星体蓝金色光波环（播放时出现）
const waveGeo = new THREE.RingGeometry(1.4, 1.6, 64);
const waveMat = new THREE.MeshBasicMaterial({
  color: 0x6a8fd0, transparent: true, opacity: 0, side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const wave = new THREE.Mesh(waveGeo, waveMat);
wave.rotation.x = -Math.PI / 2;
starGroup.add(wave);

/* 接触暖光（落针点） */
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  rg.addColorStop(0, 'rgba(255,224,160,.9)'); rg.addColorStop(1, 'rgba(255,224,160,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();
const glow = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
}));
glow.visible = false; scene.add(glow);

/* 落针点接触阴影 */
const shTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(128, 128, 8, 128, 128, 128);
  rg.addColorStop(0, 'rgba(4,7,14,.55)'); rg.addColorStop(.7, 'rgba(4,7,14,.28)');
  rg.addColorStop(1, 'rgba(4,7,14,0)');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
})();
const shMat = new THREE.MeshBasicMaterial({ map: shTex, transparent: true, depthWrite: false });
const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.075, 48), shMat);
shadow.rotation.x = -Math.PI / 2;

/* ---- 加载模型（大文件偶发 ERR_ABORTED：8 次递增退避重试；彻底失败发事件通知页面） ---- */
const ARM_GLB_URL = 'assets/models/tonearm-new.glb';
function loadArm(retries = 8, attempt = 0) {
  const loader = new GLTFLoader();
  loader.load(ARM_GLB_URL, (gltf) => {
    window.__arm3dFailed = false;
    setupModel(gltf);
  }, undefined, (err) => {
    console.warn('[arm3d] load failed, retries left:', retries, err);
    if (retries > 0) {
      // 递增退避：0.8s → 1.4s → 2.0s … 上限 4s，给大文件加载留足恢复时间
      const delay = Math.min(800 + attempt * 600, 4000);
      setTimeout(() => loadArm(retries - 1, attempt + 1), delay);
    } else {
      console.error('[arm3d] model load gave up after retries');
      window.__arm3dFailed = true;
      window.dispatchEvent(new Event('arm3dfailed'));
    }
  });
}
// 供页面"重试"按钮调用
window.__arm3dReload = () => {
  window.__arm3dFailed = false;
  loadArm(8, 0);
};
/* 延迟加载 14MB 模型：等首屏（封面/漩涡/文字）先出来再拉模型，
   避免大文件与雪碧图/字体抢带宽，缩短「页面能看」的时间。
   页面 load 后立刻加载（不额外空等），仅延后到关键资源之后。 */
function kickArmLoad(){
  if (document.readyState === 'complete') { loadArm(); }
  else { window.addEventListener('load', () => loadArm(), { once:true }); }
}
kickArmLoad();
function setupModel(gltf) {
  // 支持多网格模型：把所有子 mesh 收集到 modelG
  const meshes = [];
  gltf.scene.traverse((o) => { if (o.isMesh) meshes.push(o); });
  console.log('[arm3d] model meshes:', meshes.length);

  /* 细磨砂（喷砂金属）贴图：高频灰噪声。
     作 roughnessMap → 环境反射出现细碎颗粒；作 bumpMap → 表面微观起伏。
     灰度取 0.55~0.85（偏亮）：final roughness = roughness × texel，
     保持金属亮泽的同时只有细微变化，不会变灰变暗。 */
  const frostTex = (() => {
    const size = 512;
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size), d = img.data;
    for (let i = 0; i < size * size; i++) {
      const v = 140 + (Math.random() * 76) | 0;   // 140~215
      d[i*4] = d[i*4+1] = d[i*4+2] = v; d[i*4+3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    return t;
  })();

  const group = new THREE.Group();
  const allMats = [];
  meshes.forEach((src) => {
    // 保留导出贴图；金属度/粗糙度取折中值避免环境反射过暗（roughness=1 时几乎全黑）
    const mat = (src.material || new THREE.MeshStandardMaterial()).clone();
    mat.envMapIntensity = 2.0;
    if ('metalness' in mat) { mat.metalness = 0.85; mat.roughness = Math.min(mat.roughness ?? 0.5, 0.32); }
    mat.side = THREE.DoubleSide;
    mat.transparent = true;
    // 喷砂磨砂：仅在网格带 UV 时应用（无 UV 的网格贴图无效）
    if (src.geometry && src.geometry.attributes && src.geometry.attributes.uv) {
      mat.roughnessMap = frostTex;
      mat.bumpMap = frostTex;
      mat.bumpScale = 0.0012;
      mat.needsUpdate = true;
    }
    allMats.push(mat);
    const m = new THREE.Mesh(src.geometry, mat);
    group.add(m);
  });

  // 计算整体包围盒
  const box = new THREE.Box3().setFromObject(group);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  console.log('[arm3d] model size:', size.x.toFixed(3), size.y.toFixed(3), size.z.toFixed(3),
              'center:', center.x.toFixed(3), center.y.toFixed(3), center.z.toFixed(3));

  // 新模型（已标定）：圆盘底座+配重在模型+Y端，唱头+针尖在-Y端，正面法线沿Z
  // 欧拉顺序必须 YXZ：先 Rx(-90°) 放平（法线Z→+Y朝上、+Y端→-Z），再 Ry(0.064) 微调方位对准 TIP_PHI
  group.rotation.order = 'YXZ';
  group.scale.setScalar(0.5);
  group.rotation.set(-Math.PI / 2, 0.064, 0);
  // 平移使枢轴（圆盘中心，本地≈(0.03,0.52,0)）落在原点
  group.position.set(-0.004, 0, 0.26);
  modelG.add(group);

  shadow.position.set(0, -TIP.y - 0.004, 0);
  modelG.add(shadow);

  window.__arm3dMaterials = allMats;
  window.__arm3dReady = true;
  window.__arm3dDbg = { root, alignG, spinG, cueG, modelG, group, shadow, glow, starGroup, star, camera, renderer, get S() { return curScale; } };
  window.dispatchEvent(new Event('arm3dready'));
}

/* ---- 每帧 ---- */
let lastW = 0, lastH = 0, curScale = 1;
function applyState() {
  const { W, H, Px, Py, Nx, Ny, shown, k, drop, restDelta, tiltK, shiftX, starShown, starGlow } = S;
  if (W !== lastW || H !== lastH) {
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2;
    camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
    lastW = W; lastH = H;
  }

  // 相机俯角（每帧根据 tiltK 更新）
  updateCamera();

  // 星体定位到银河中心，并随 shiftX 右移、随 tilt 调整 z
  const starWorldX = shiftX;
  const starWorldZ = (H * 0.46 - H / 2) / sE; // 银河中心 cy=H*.46
  starGroup.position.set(starWorldX, 0, starWorldZ);
  const starR = Math.min(W, H) * 0.045 * (1 - starGlow * 0.15);
  starGroup.scale.setScalar(starR);
  star.visible = starShown > 0.01;
  star.material.opacity = starShown;
  star.material.transparent = true;
  starRim.material.uniforms.uGlow.value = starGlow;
  starRim.visible = starShown > 0.01;
  // 星体发光
  star.material.emissiveIntensity = 0.4 + starGlow * 1.6;
  // 光波环
  if (starGlow > 0.01) {
    waveMat.opacity = starGlow * 0.6;
    const ws = 1 + starGlow * 1.5;
    wave.scale.set(ws, ws, 1);
    wave.material.color.setHex(starGlow > 0.5 ? 0xd8b878 : 0x6a8fd0);
  } else {
    waveMat.opacity = 0;
  }

  if (!window.__arm3dReady) return;

  const dx0 = Nx - Px, dy0 = Ny - Py;
  const L3 = Math.hypot(dx0, dy0 / sE);
  const phiPlay = Math.atan2(dy0 / sE, dx0);
  const playA = Math.atan2(dy0, dx0);
  const restDeltaEff = REST_DELTA; // 实时调参优先
  const restA = playA - restDeltaEff;
  const phiRest = Math.atan2(Math.sin(restA) / sE, Math.cos(restA));
  const Rrest = phiPlay - phiRest;

  curScale = (L3 / TIP_LEN) * FIT;
  // 唱臂全程平贴唱片平面（与漩涡同一透视空间，静止/播放都不抬头、不切片）；
  // 尺寸恒定（整体缩小一点），静止与播放只差水平方位角。
  // dk：末段降臂进度（抬针摆入 → 落针），仅驱动 cue 抬升、阴影与暖光。
  const kk = Math.max(0, Math.min(1, (k - CUE_K0) / (1 - CUE_K0)));
  const dk = kk * kk * (3 - 2 * kk);
  modelG.rotation.x = 0;
  modelG.scale.setScalar(curScale * ARM_SHRINK);
  shadow.rotation.x = -Math.PI / 2;

  // 根节点：P 点（P/N 已含 shiftX，勿重复加）
  root.position.set(Px - W / 2, -60, (Py - H / 2) / sE);
  alignG.rotation.y = TIP_PHI - phiPlay;
  spinG.rotation.y = Rrest * (1 - k);

  let lift = 0;
  if (k > 0 && k < 1) lift = LIFT * (1 - dk); // 摆入段抬着走，落针段随 dk 平滑归零
  if (drop > 0) lift -= drop * 0.0011;
  cueG.rotation.z = -lift;

  const mats = window.__arm3dMaterials;
  if (mats) mats.forEach(m => m.opacity = shown);
  // 静止外圈搁臂有淡阴影，落针接触后阴影变实
  shadow.material.opacity = shown * (0.32 + 0.58 * dk);

  if (k >= 1 && shown > 0.5) {
    glow.visible = true;
    // 暖光跟随缩小后的实际针尖：P + ARM_SHRINK*(N-P)
    glow.position.set(
      Px + (Nx - Px) * ARM_SHRINK - W / 2, 2,
      (Py + (Ny - Py) * ARM_SHRINK - H / 2) / sE);
    glow.scale.setScalar(24);
    glow.material.opacity = shown;
  } else glow.visible = false;
}
function loop() {
  requestAnimationFrame(loop);
  applyState();
  renderer.render(scene, camera);
}
loop();
