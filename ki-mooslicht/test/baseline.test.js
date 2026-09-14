import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,sep} from 'node:path';
import {SAVE_KEY,readSave,writeSave} from '../src/game.js';

test('KI-Mooslicht: runtime imports stay inside the independent source tree',()=>{
  const root=fileURLToPath(new URL('../src/',import.meta.url));
  for(const file of readdirSync(root).filter(f=>f.endsWith('.js'))){
    const code=readFileSync(resolve(root,file),'utf8');
    assert.ok(!code.includes('minigames.mooslicht.'));
    for(const match of code.matchAll(/(?:from\s*|import\s*\()\s*['"]([^'"]+)['"]/g)){
      const specifier=match[1];if(!specifier.startsWith('.')){assert.ok(specifier==='three'||specifier.startsWith('three/'));continue;}
      const target=resolve(root,specifier);assert.ok(target.startsWith(root.endsWith(sep)?root:root+sep));assert.ok(existsSync(target));
    }
  }
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.ok(html.includes('./src/main.js'));assert.ok(html.includes('./src/style.css'));assert.ok(!html.includes('../src/mooslicht/'));
});

test('KI-Mooslicht: saving appearance and progress leaves the original namespace untouched',()=>{
  const original='minigames.mooslicht.v1',data=new Map([[original,'original-save']]);
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
  assert.equal(SAVE_KEY,'minigames.ki-mooslicht.v1');assert.equal(readSave(storage),null);
  assert.equal(writeSave(storage,{quests:{garden:true},appearance:{variant:'feminine',hair:'long'}}),true);
  assert.equal(data.get(original),'original-save');assert.equal(readSave(storage).quests.garden,true);assert.equal(readSave(storage).appearance.variant,'feminine');
  const main=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  assert.ok(main.includes('minigames.ki-mooslicht.settings'));assert.ok(!main.includes('minigames.mooslicht.settings'));
});
