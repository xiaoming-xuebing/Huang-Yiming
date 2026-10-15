// 简化版 GLB 加载器（仅支持 tonearm-new.glb 的结构）
// 单 mesh / 单材质 / POSITION+NORMAL+TEXCOORD_0 / indices / 2 张 PNG 纹理
import * as THREE from 'three';

const COMPONENT_SIZE = {
  5120: 1, // BYTE
  5121: 1, // UNSIGNED_BYTE
  5122: 2, // SHORT
  5123: 2, // UNSIGNED_SHORT
  5125: 4, // UNSIGNED_INT
  5126: 4, // FLOAT
};
const NUM_COMPONENTS = {
  SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT2: 4, MAT3: 9, MAT4: 16,
};

export class SimpleGLTFLoader {
  constructor(manager) {
    this.manager = manager || THREE.DefaultLoadingManager;
  }
  load(url, onLoad, onProgress, onError) {
    const loader = new THREE.FileLoader(this.manager);
    loader.setResponseType('arraybuffer');
    loader.load(url, (data) => {
      try {
        const gltf = this.parse(data);
        onLoad(gltf);
      } catch (e) {
        if (onError) onError(e); else console.error(e);
      }
    }, onProgress, onError);
  }
  parse(data) {
    const dv = new DataView(data);
    // header
    const magic = dv.getUint32(0, true);
    if (magic !== 0x46546C67) throw new Error('Not a GLB file');
    let offset = 12;
    // JSON chunk
    const jsonLen = dv.getUint32(offset, true);
    const jsonType = dv.getUint32(offset + 4, true);
    offset += 8;
    const jsonText = new TextDecoder().decode(new Uint8Array(data, offset, jsonLen));
    offset += jsonLen;
    const json = JSON.parse(jsonText);
    // BIN chunk
    const binLen = dv.getUint32(offset, true);
    const binType = dv.getUint32(offset + 4, true);
    offset += 8;
    const bin = new Uint8Array(data, offset, binLen);

    // bufferViews（记录在整个文件 ArrayBuffer 上的绝对偏移，供零拷贝 TypedArray 视图使用）
    const binStart = offset; // BIN chunk 在文件中的起始字节
    const bufferViews = json.bufferViews.map(bv => ({
      buffer: data,
      byteOffset: binStart + (bv.byteOffset || 0),
      byteLength: bv.byteLength,
    }));

    // accessors -> typed arrays（零拷贝视图；GLB 规范保证字节对齐）
    function getAccessor(idx) {
      const acc = json.accessors[idx];
      const bv = bufferViews[acc.bufferView];
      const compSize = COMPONENT_SIZE[acc.componentType];
      const numComp = NUM_COMPONENTS[acc.type];
      const base = bv.byteOffset + (acc.byteOffset || 0);
      const count = acc.count;
      const need = count * numComp;
      let arr;
      switch (acc.componentType) {
        case 5125: arr = new Uint32Array(bv.buffer, base, need); break;
        case 5126: arr = new Float32Array(bv.buffer, base, need); break;
        case 5123: arr = new Uint16Array(bv.buffer, base, need); break;
        case 5121: arr = new Uint8Array(bv.buffer, base, need); break;
        default: throw new Error('Unsupported componentType: ' + acc.componentType);
      }
      return { arr, count, numComp, type: acc.type, min: acc.min, max: acc.max };
    }

    // textures (from embedded PNG images)
    const textures = [];
    if (json.textures) {
      json.textures.forEach((tex) => {
        const img = json.images[tex.source];
        const bv = bufferViews[img.bufferView];
        const blob = new Blob([new Uint8Array(bv.buffer, bv.byteOffset, bv.byteLength)], { type: img.mimeType });
        const url = URL.createObjectURL(blob);
        const tex2d = new THREE.TextureLoader(this.manager).load(url);
        tex2d.flipY = false;
        tex2d.colorSpace = THREE.SRGBColorSpace;
        textures.push(tex2d);
      });
    }

    // materials
    const materials = json.materials.map((m) => {
      const pbr = m.pbrMetallicRoughness || {};
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().fromArray(pbr.baseColorFactor || [1, 1, 1, 1]),
        metalness: pbr.metallicFactor ?? 1,
        roughness: pbr.roughnessFactor ?? 1,
        transparent: m.alphaMode === 'BLEND',
        side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      });
      if (pbr.baseColorTexture) mat.map = textures[pbr.baseColorTexture.index];
      if (pbr.metallicRoughnessTexture) mat.roughnessMap = textures[pbr.metallicRoughnessTexture.index];
      if (pbr.metallicRoughnessTexture) mat.metalnessMap = textures[pbr.metallicRoughnessTexture.index];
      return mat;
    });

    // meshes
    const scene = new THREE.Group();
    json.meshes.forEach((mesh) => {
      mesh.primitives.forEach((prim) => {
        const geom = new THREE.BufferGeometry();
        const attrs = prim.attributes;
        if (attrs.POSITION !== undefined) {
          const a = getAccessor(attrs.POSITION);
          geom.setAttribute('position', new THREE.BufferAttribute(a.arr, a.numComp));
          if (a.min && a.max) geom.boundingBox = new THREE.Box3(new THREE.Vector3(...a.min), new THREE.Vector3(...a.max));
        }
        if (attrs.NORMAL !== undefined) {
          const a = getAccessor(attrs.NORMAL);
          geom.setAttribute('normal', new THREE.BufferAttribute(a.arr, a.numComp));
        }
        if (attrs.TEXCOORD_0 !== undefined) {
          const a = getAccessor(attrs.TEXCOORD_0);
          geom.setAttribute('uv', new THREE.BufferAttribute(a.arr, a.numComp));
        }
        if (prim.indices !== undefined) {
          const a = getAccessor(prim.indices);
          geom.setIndex(new THREE.BufferAttribute(a.arr, 1));
        }
        const mesh3d = new THREE.Mesh(geom, materials[prim.material || 0]);
        scene.add(mesh3d);
      });
    });

    return { scene };
  }
}
