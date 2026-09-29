const test = require('node:test');
const assert = require('node:assert/strict');
const { VenueFilterMotion } = require('../miniprogram/utils/venue-filter-motion');

const venues = ['a', 'b', 'c', 'd'].map((id) => ({ id }));
const basketball = [venues[1], venues[3]];
const heights = { a: 130, b: 172, c: 146, d: 120 };
const ids = (view) => view.venueList.map((venue) => venue.id);
const opacity = (view, id) => Number(/(?:^|;)opacity:([\d.]+)/.exec(view.cardStyles[id])?.[1]);
const y = (view, id) => Number(/translateY\(([-\d.]+)px\)/.exec(view.cardStyles[id])?.[1]);

function snapshot(items, { top = 180, positions = {}, opacities = {} } = {}) {
  let offset = 0;
  const cards = items.map(({ id }) => {
    const rect = { dataset: { id }, top: top + (positions[id] ?? offset), height: heights[id], opacity: String(opacities[id] ?? 1) };
    offset += heights[id];
    return rect;
  });
  return { top, height: offset, cards };
}

function harness() {
  const measurements = [];
  const frames = [];
  const timers = [];
  const motion = new VenueFilterMotion({
    measure: (callback) => measurements.push(callback),
    render: (view, callback) => { frames.push(structuredClone(view)); callback?.(); },
    schedule: (callback, ms) => { const timer = { callback, ms, cancelled: false }; timers.push(timer); return timer; },
    unschedule: (timer) => { timer.cancelled = true; },
  });
  return {
    motion, frames, timers, measurements,
    get last() { return frames.at(-1); },
    measure(value) { assert.ok(measurements.length, '期待一次原生视图测量'); measurements.shift()(value); },
    tick() { const timer = timers.find((item) => !item.cancelled && !item.ran); assert.ok(timer, '期待一个动画阶段'); timer.ran = true; timer.callback(); return timer.ms; },
  };
}

test('全部到球类：其他卡片先淡出，保留项始终不透明并按实际高度补位', () => {
  const h = harness();
  h.motion.transition(venues, basketball, false);
  h.measure(snapshot(venues));
  assert.equal(y(h.last, 'b'), heights.a);
  assert.equal(y(h.last, 'd'), heights.a + heights.b + heights.c);
  h.measure(snapshot(venues));
  h.tick();
  assert.deepEqual(ids(h.last).sort(), ['a', 'b', 'c', 'd']);
  assert.equal(opacity(h.last, 'a'), 0);
  assert.equal(opacity(h.last, 'c'), 0);
  assert.equal(y(h.last, 'b'), heights.a, '淡出阶段保留项不跳位');
  assert.equal(h.tick(), 720, '退出卡片应完成淡出才移除');
  assert.deepEqual(ids(h.last), ['b', 'd']);
  assert.equal(y(h.last, 'b'), 0);
  assert.equal(y(h.last, 'd'), heights.b);
  assert.match(h.last.cardStyles.b, /transform 780ms/);
  for (const frame of h.frames) for (const id of ['b', 'd']) assert.equal(opacity(frame, id), 1, `${id} 不应随列表淡出`);
  h.tick();
  assert.equal(h.last.filterAnimating, false);
  assert.equal(h.last.listStyle, '');
  assert.deepEqual(h.last.cardStyles, {});
});

test('球类到全部：保留项从原位置滑回完整排序，其余卡片在目标位置淡入', () => {
  const h = harness();
  h.motion.transition(basketball, venues, true);
  h.measure(snapshot(basketball));
  assert.deepEqual(ids(h.last), ['a', 'b', 'c', 'd'], '新节点在淡入前就应处于最终顺序');
  assert.equal(y(h.last, 'b'), 0);
  assert.equal(y(h.last, 'd'), heights.b);
  assert.equal(opacity(h.last, 'a'), 0, '新挂载卡片不能闪现');
  h.measure(snapshot([venues[1], venues[3], venues[0], venues[2]]));
  h.tick();
  assert.equal(y(h.last, 'c'), heights.a + heights.b);
  assert.equal(opacity(h.last, 'c'), 0);
  h.tick();
  assert.deepEqual(ids(h.last), ['a', 'b', 'c', 'd']);
  assert.equal(y(h.last, 'b'), heights.a);
  assert.equal(y(h.last, 'd'), heights.a + heights.b + heights.c);
  assert.match(h.last.cardStyles.b, /transform 520ms/);
  assert.match(h.last.cardStyles.a, /opacity 720ms/);
  for (const frame of h.frames) for (const id of ['b', 'd']) assert.equal(opacity(frame, id), 1);
  assert.equal(opacity(h.last, 'a'), 1);
  h.tick();
  assert.deepEqual(ids(h.last), ['a', 'b', 'c', 'd']);
  assert.equal(h.last.filterAnimating, false);
});

test('移动途中反向切换从当前屏幕位置和透明度接续，旧计时器不能清理新动画', () => {
  const h = harness();
  h.motion.transition(venues, basketball, false);
  h.measure(snapshot(venues));
  h.measure(snapshot(venues));
  h.tick();
  h.tick();
  const oldFinish = h.timers.at(-1).callback;
  h.motion.transition(basketball, venues, true);
  // 视口滚动过，卡片正在两端位置之间移动。
  h.measure(snapshot(basketball, { top: 95, positions: { b: 48.5, d: 242.25 } }));
  assert.equal(y(h.last, 'b'), 48.5);
  assert.equal(y(h.last, 'd'), 242.25);
  const frame = h.last;
  oldFinish();
  assert.equal(h.last, frame);
  h.measure(snapshot(venues, { top: 95 }));
  h.tick(); h.tick(); h.tick();
  assert.deepEqual(ids(h.last), ['a', 'b', 'c', 'd']);
  assert.equal(h.last.filterAnimating, false);
});

test('淡出途中切回全部时，原保留项保持可见，其他项从当前透明度恢复', () => {
  const h = harness();
  h.motion.transition(venues, basketball, false);
  h.measure(snapshot(venues)); h.measure(snapshot(venues)); h.tick();
  h.motion.transition(venues, venues, true);
  h.measure(snapshot(venues, { opacities: { a: 0.36, c: 0.36 } }));
  assert.equal(opacity(h.last, 'a'), 0.36);
  assert.equal(opacity(h.last, 'b'), 1);
  h.measure(snapshot(venues)); h.tick(); h.tick();
  assert.equal(opacity(h.last, 'a'), 1);
  assert.deepEqual(ids(h.last), ['a', 'b', 'c', 'd']);
  h.tick();
  assert.equal(h.last.filterAnimating, false);
});

test('连续切换只接受最新测量，取消后任何阶段的旧回调都失效', () => {
  for (let phase = 0; phase < 4; phase++) {
    const h = harness();
    h.motion.transition(venues, basketball, false);
    h.motion.transition(venues, [venues[0]], false);
    h.measure(snapshot(venues));
    assert.equal(h.frames.length, 0, '旧选择的测量不能修改视图');
    h.measure(snapshot(venues));
    if (phase > 0) h.measure(snapshot(venues));
    if (phase > 1) h.tick();
    if (phase > 2) h.tick();
    h.motion.cancel();
    const frameCount = h.frames.length;
    h.measurements.splice(0).forEach((callback) => callback(snapshot(venues)));
    h.timers.forEach((timer) => timer.callback());
    assert.equal(h.frames.length, frameCount, `阶段 ${phase} 的旧回调失效`);
  }
});

test('无匹配球类淡出到空状态后，切回全部仍按原顺序淡入', () => {
  const h = harness();
  h.motion.transition(venues, [], false);
  h.measure(snapshot(venues)); h.measure(snapshot(venues)); h.tick(); h.tick();
  assert.deepEqual(h.last.venueList, []);
  assert.equal(h.last.filterAnimating, false);
  h.motion.transition([], venues, true);
  h.measure({ top: 180, height: 160, cards: [] });
  h.measure(snapshot(venues)); h.tick();
  assert.equal(opacity(h.last, 'a'), 0);
  h.tick(); h.tick();
  assert.deepEqual(ids(h.last), ['a', 'b', 'c', 'd']);
  assert.equal(h.last.filterAnimating, false);
});
