export const GEAR = {
  ember: { name: 'Glutwerfer', level: 2, cost: 85, types: ['bush'], bonus: 2, hint: '+2 Schaden an Holz' },
  machine: { name: 'Hackmaschine', level: 4, cost: 240, types: ['rock', 'crystal'], bonus: 3, hint: '+3 Schaden an Stein und Kristall' },
};

export function equipGear(state, id) {
  if (id !== 'pick') {
    if (!Object.hasOwn(GEAR, id)) return false;
    const gear = GEAR[id];
    if (state.tool < gear.level) return false;
    if (!state.gear.includes(id)) {
      if (state.coins < gear.cost) return false;
      state.coins -= gear.cost;
      state.gear.push(id);
    }
  }
  state.equipped = id;
  return true;
}

export function gearFor(state, type) {
  const id = state.equipped;
  return Object.hasOwn(GEAR, id) && state.gear.includes(id) && GEAR[id].types.includes(type) ? id : 'pick';
}

export function restoreGear(state, saved) {
  if (Array.isArray(saved.gear)) {
    state.gear = Object.keys(GEAR).filter(id => saved.gear.includes(id) && state.tool >= GEAR[id].level);
  }
  if (state.gear.includes(saved.equipped)) state.equipped = saved.equipped;
}
