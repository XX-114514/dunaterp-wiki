// Behaviour checks against the real engine, using the existing offline canvas shim.
import assert from 'node:assert/strict';
import { installShim } from './canvas2d.mjs';
installShim();
document.querySelector = () => null;
globalThis.window = { matchMedia: () => ({ matches: false }) };
globalThis.Element = class { constructor(interactive = false) { this.interactive = interactive; } closest() { return this.interactive ? this : null; } };
const { PixelEngine, createNpcs, isBlockedAt } = await import('./.out/entry.js');
let talks = 0, entries = 0;
const engine = new PixelEngine(document.createElement('canvas'), { clientWidth: 1280, clientHeight: 800 }, {
  onLoadProgress() {}, onReady() {}, onMode() {}, onChapter() {}, onPrompt() {},
  onEnter() { entries++; }, onNpcInteract() { talks++; },
});
const key = (value, interactive = false, repeat = false) => ({ key: value, repeat, target: new Element(interactive), preventDefault() {} });
engine.enterFree();
for (const npc of createNpcs(engine.world)) {
  assert.equal(isBlockedAt(engine.world, npc.x, npc.y), false, `${npc.id} must be reachable`);
  Object.assign(engine.hero, { x: npc.x, y: npc.y });
  engine.updateProximity();
  const before = talks;
  engine.onKeyDown(key('Enter', true));
  assert.equal(talks, before, 'native buttons retain Enter');
  engine.onKeyDown(key('e', false, true));
  assert.equal(talks, before, 'held interaction key cannot reopen dialogue');
  engine.onKeyDown(key('e'));
  assert.equal(talks, before + 1, 'E talks to the nearest NPC');
}
engine.setMoveKey('w', true);
assert.equal(engine.keys.has('w'), true);
engine.setPaused(true);
assert.equal(engine.keys.size, 0, 'opening a modal releases movement');
const before = talks;
engine.onKeyDown(key('e'));
engine.interact();
assert.equal(talks, before, 'dialogue blocks world interaction');
engine.setPaused(false);
engine.onPointerDown({ pointerId: 1, isPrimary: true, clientX: 10, clientY: 10 });
engine.onPointerDown({ pointerId: 2, isPrimary: false, clientX: 100, clientY: 100 });
assert.equal(engine.stick.originX, 10, 'second touch must not reset the joystick');
engine.onPointerUp({ pointerId: 2 });
assert.equal(engine.stick.active, true, 'second touch must not release the joystick');
engine.onPointerUp({ pointerId: 1 });
assert.equal(engine.stick.active, false);
engine.setMoveKey('d', true);
engine.onBlur();
assert.equal(engine.keys.size, 0, 'blur releases movement');
assert.equal(engine.travelToStation('missing'), false);
assert.equal(engine.travelToStation('archive'), true);
const station = engine.world.archive;
Object.assign(engine.hero, { x: station.x, y: station.y + 6 });
engine.updateProximity();
engine.interact();
assert.equal(entries, 1, 'archive remains reachable');
console.log('PASS: NPC reachability, interaction priority, keyboard ownership, pause, multitouch, blur, travel and archive');
