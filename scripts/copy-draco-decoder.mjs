// scripts/copy-draco-decoder.mjs
// Recopie le décodeur DRACO depuis node_modules vers public/draco/.
// Utile après `npm install` (les fichiers WASM/JS doivent être servis tels
// quels par Vite ; ils ne sont PAS importés en module).

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src  = path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'libs', 'draco', 'gltf');
const dst  = path.join(root, 'public', 'draco');

await fs.rm(dst, { recursive: true, force: true });
await fs.mkdir(dst, { recursive: true });
await fs.cp(src, dst, { recursive: true });

const files = await fs.readdir(dst);
console.log(`OK : public/draco/ (${files.length} fichiers : ${files.join(', ')})`);
