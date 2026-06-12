// scripts/build-test-glb.mjs
//
// Génère public/assets/models/test/cube-draco.glb — petit cube unitaire
// compressé avec KHR_draco_mesh_compression. Sert de preuve de chaîne
// (loader DRACO + decoder WASM côté navigateur) pour la mission M0.
// Lance avec : `npm run assets:test-glb`.
//
// On encode directement via draco3d (le même WASM que le navigateur charge
// pour décoder côté client), puis on emballe le résultat dans un GLB 2.0
// avec l'extension de compression et un fallback "indices vides + bbox".

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const draco3d = require('draco3d');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir  = path.resolve(__dirname, '..', 'public', 'assets', 'models', 'test');
const outPath = path.join(outDir, 'cube-draco.glb');

const positions = new Float32Array([
  -1,-1,-1, +1,-1,-1, +1,+1,-1, -1,+1,-1,
  -1,-1,+1, +1,-1,+1, +1,+1,+1, -1,+1,+1,
]);
const indices = new Uint32Array([
  0,1,2, 0,2,3,   // -Z
  4,6,5, 4,7,6,   // +Z
  0,4,5, 0,5,1,   // -Y
  3,2,6, 3,6,7,   // +Y
  1,5,6, 1,6,2,   // +X
  0,3,7, 0,7,4,   // -X
]);

const encoderModule = await draco3d.createEncoderModule();
const encoder  = new encoderModule.Encoder();
const builder  = new encoderModule.MeshBuilder();
const mesh     = new encoderModule.Mesh();

const numFaces = indices.length / 3;
builder.AddFacesToMesh(mesh, numFaces, indices);
const positionAttrId = builder.AddFloatAttributeToMesh(
  mesh, encoderModule.POSITION, positions.length / 3, 3, positions);

encoder.SetSpeedOptions(3, 3);           // ~ compressionLevel 7
encoder.SetAttributeQuantization(encoderModule.POSITION, 14);
encoder.SetTrackEncodedProperties(true);

const dracoArr = new encoderModule.DracoInt8Array();
const dracoLen = encoder.EncodeMeshToDracoBuffer(mesh, dracoArr);
if (dracoLen <= 0) throw new Error('Draco encoding failed (0 bytes)');

const draco = Buffer.alloc(dracoLen);
for (let i=0; i<dracoLen; i++) draco[i] = dracoArr.GetValue(i);

const numEncodedPoints = encoder.GetNumberOfEncodedPoints();
const numEncodedFaces  = encoder.GetNumberOfEncodedFaces();

encoderModule.destroy(dracoArr);
encoderModule.destroy(mesh);
encoderModule.destroy(builder);
encoderModule.destroy(encoder);

// Padding 4 octets pour l'alignement bufferView.
const dracoPad   = (4 - (draco.length % 4)) % 4;
const dracoBin   = Buffer.concat([draco, Buffer.alloc(dracoPad)]);

// glTF 2.0 — extension KHR_draco_mesh_compression. Les accessors POSITION
// (id 0) et indices (id 1) restent présents mais sans bufferView : le
// décodeur les remplit depuis le flux DRACO. Les `min/max` de POSITION et le
// `count` sont obligatoires pour les loaders qui n'ont PAS l'extension.
const gltf = {
  asset: { version: '2.0', generator: 'circuit-du-capital M0 build-test-glb' },
  extensionsUsed: ['KHR_draco_mesh_compression'],
  extensionsRequired: ['KHR_draco_mesh_compression'],
  scene: 0,
  scenes: [{ nodes: [0] }],
  nodes:  [{ mesh: 0, name: 'M0_TestCube' }],
  meshes: [{ primitives: [{
    attributes: { POSITION: 0 },
    indices: 1,
    mode: 4,
    extensions: {
      KHR_draco_mesh_compression: {
        bufferView: 0,
        attributes: { POSITION: positionAttrId },
      },
    },
  }] }],
  accessors: [
    { componentType: 5126, count: positions.length/3, type: 'VEC3',
      min: [-1,-1,-1], max: [1,1,1] },
    { componentType: 5125, count: indices.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { buffer: 0, byteOffset: 0, byteLength: draco.length },
  ],
  buffers: [{ byteLength: dracoBin.length }],
};

// Sérialisation GLB (header + JSON chunk + BIN chunk).
const jsonStr = JSON.stringify(gltf);
const jsonBuf = Buffer.from(jsonStr, 'utf-8');
const jsonPad = (4 - (jsonBuf.length % 4)) % 4;
const jsonChunk = Buffer.concat([jsonBuf, Buffer.alloc(jsonPad, 0x20)]);
const binPad   = (4 - (dracoBin.length % 4)) % 4;
const binChunk = Buffer.concat([dracoBin, Buffer.alloc(binPad, 0)]);

const totalLen = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
const out = Buffer.alloc(totalLen);
let p = 0;
out.writeUInt32LE(0x46546C67, p); p += 4;   // magic "glTF"
out.writeUInt32LE(2, p);          p += 4;   // version
out.writeUInt32LE(totalLen, p);   p += 4;   // total
out.writeUInt32LE(jsonChunk.length, p); p += 4;
out.writeUInt32LE(0x4E4F534A, p);       p += 4; // "JSON"
jsonChunk.copy(out, p); p += jsonChunk.length;
out.writeUInt32LE(binChunk.length, p); p += 4;
out.writeUInt32LE(0x004E4942, p);      p += 4; // "BIN\0"
binChunk.copy(out, p); p += binChunk.length;

await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(outPath, out);

console.log(`OK : ${path.relative(process.cwd(), outPath)} (${out.length} octets · `
  + `DRACO ${draco.length} octets · ${numEncodedPoints} sommets, ${numEncodedFaces} faces)`);
