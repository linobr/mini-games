import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, relative } from 'node:path';
const root = resolve('dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (await Promise.all(entries.map(e => e.isDirectory() ? files(resolve(dir, e.name)) : resolve(dir, e.name)))).flat();
}
const paths = (await files(root)).filter(p => !p.endsWith('/sw.js')).sort();
const hash = createHash('sha256');
for (const p of paths) { hash.update(relative(root, p)); hash.update(await readFile(p)); }
const version = hash.digest('hex').slice(0, 16);
const urls = paths.map(p => relative(root, p).split('\\').join('/'));
const template = await readFile('scripts/sw-template.js', 'utf8');
await writeFile(resolve(root, 'sw.js'), template.replace('__BUILD_VERSION__', version).replace('__PRECACHE_URLS__', JSON.stringify(urls)));
console.log(`PWA ${version}: ${urls.length} local files, atomic precache`);
