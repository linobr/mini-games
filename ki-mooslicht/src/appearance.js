export const APPEARANCE_OPTIONS = {
  variant:[['masculine','Männlich'],['feminine','Weiblich']],
  hair:[['curly','Locken'],['short','Kurz'],['long','Lang']],
  hairColor:[['chestnut','Kastanie','#846044'],['dark','Dunkelbraun','#392b29'],['black','Schwarz','#252b33'],['copper','Kupfer','#a55c36'],['gold','Goldblond','#c5a46b'],['silver','Silber','#b5bec6']],
  skin:[['peach','Pfirsich','#ecc29c'],['ivory','Elfenbein','#f4d9bf'],['sand','Sand','#d3a479'],['amber','Bernstein','#b88059'],['umber','Umbra','#86583f'],['ebony','Ebenholz','#593e34']],
  eyes:[['blue','Blau','#3988cd'],['green','Grün','#54896c'],['brown','Braun','#765039'],['grey','Grau','#7d929c']],
  outfit:[['blue','Himmelblau','#477e9d'],['forest','Waldgrün','#52765f'],['berry','Brombeere','#805777'],['rust','Abendrot','#aa6655'],['sand','Dünensand','#a69773']],
};
export const DEFAULT_APPEARANCE=Object.freeze({variant:'masculine',hair:'curly',hairColor:'chestnut',skin:'peach',eyes:'blue',outfit:'blue'});
export function cleanAppearance(value){
  const s=value&&typeof value==='object'?value:{};
  return Object.fromEntries(Object.keys(DEFAULT_APPEARANCE).map(k=>[k,APPEARANCE_OPTIONS[k].some(o=>o[0]===s[k])?s[k]:DEFAULT_APPEARANCE[k]]));
}
export const appearanceColor=(key,value)=>APPEARANCE_OPTIONS[key].find(o=>o[0]===value)?.[2];
// A transaction independent of the UI: draft/reset never mutate confirmed saves.
export class AppearanceDraft {
  constructor(value){this.original=cleanAppearance(value);this.value={...this.original};}
  choose(key,value){this.value=cleanAppearance({...this.value,[key]:value});return this.value;}
  reset(){this.value={...DEFAULT_APPEARANCE};return this.value;}
  cancel(){return {...this.original};}
  confirm(){return cleanAppearance(this.value);}
}
