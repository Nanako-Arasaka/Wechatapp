"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VenueFilterMotion = void 0;
const FADE_OUT_MS = 720;
const FADE_IN_MS = 720;
const MOVE_UP_MS = 780;
const MOVE_BACK_MS = 520;
const MOVE_EASE = "cubic-bezier(.22,1,.36,1)";
const FADE_EASE = "cubic-bezier(.4,0,.2,1)";
function cardStyle(top, opacity, transition = "none", interactive = true, foreground = false) {
    return `position:absolute;left:0;right:0;top:0;transform:translateY(${top}px);opacity:${opacity};transition:${transition};pointer-events:${interactive ? "auto" : "none"};z-index:${foreground ? 2 : 1};`;
}
/**
 * 先把原卡片固定在实际显示位置，再测量新卡片并排列目标位置。
 * 卡片始终使用同一 ID；保留项不会被卸载、隐藏或套用入场动画。
 */
class VenueFilterMotion {
    constructor(view) {
        this.view = view;
        this.version = 0;
        this.timer = null;
    }
    cancel() {
        this.version++;
        if (this.timer !== null)
            this.view.unschedule(this.timer);
        this.timer = null;
    }
    transition(current, target, returningToAll) {
        // 不清空上一轮的样式：新一轮从正在移动的位置、正在变化的透明度接续。
        this.cancel();
        const version = this.version;
        const active = () => version === this.version;
        const later = (callback, ms) => {
            if (!active())
                return;
            this.timer = this.view.schedule(() => {
                if (!active())
                    return;
                this.timer = null;
                callback();
            }, ms);
        };
        const finish = () => {
            if (!active())
                return;
            this.view.render({
                venueList: target,
                cardStyles: {},
                listStyle: "",
                filterAnimating: false,
            });
        };
        this.view.measure((before) => {
            if (!active())
                return;
            if (!before)
                return finish();
            const oldRects = new Map(before.cards.map((rect) => [String(rect.dataset.id), rect]));
            const targetIds = new Set(target.map((venue) => venue.id));
            // 挂载时就使用目标顺序，退出项接在后面并固定原位置。
            // 淡入开始时再移动 keyed 节点，会让原生视图取消刚启动的透明度过渡。
            const union = [
                ...target,
                ...current.filter((venue) => !targetIds.has(venue.id)),
            ];
            const positions = new Map();
            const opacities = new Map();
            const pinned = {};
            for (const venue of union) {
                const rect = oldRects.get(venue.id);
                const top = rect ? rect.top - before.top : 0;
                const opacity = rect
                    ? Math.max(0, Math.min(1, Number(rect.opacity ?? 1)))
                    : 0;
                positions.set(venue.id, top);
                opacities.set(venue.id, opacity);
                pinned[venue.id] = cardStyle(top, opacity, "none", targetIds.has(venue.id) && opacity > 0, !!rect);
            }
            this.view.render({
                venueList: union,
                cardStyles: pinned,
                listStyle: `height:${before.height}px;`,
                filterAnimating: true,
            }, () => {
                if (!active())
                    return;
                // 新项先以透明状态挂载，仅测量高度，不让用户看到重排中间帧。
                this.view.measure((measured) => {
                    if (!active())
                        return;
                    if (!measured)
                        return finish();
                    const heights = new Map(measured.cards.map((rect) => [
                        String(rect.dataset.id),
                        rect.height,
                    ]));
                    const destinations = new Map();
                    let targetHeight = 0;
                    for (const venue of target) {
                        const height = heights.get(venue.id);
                        if (!height || !Number.isFinite(height))
                            return finish();
                        destinations.set(venue.id, targetHeight);
                        targetHeight += height;
                    }
                    // 动画完成前保留足够的页面高度，避免原生滚动条因列表缩短而提前跳位。
                    const listStyle = `height:${Math.max(before.height, targetHeight)}px;`;
                    const leaving = {};
                    let hasExits = false;
                    for (const venue of union) {
                        const opacity = opacities.get(venue.id);
                        if (!targetIds.has(venue.id)) {
                            hasExits || (hasExits = opacity > 0);
                            leaving[venue.id] = cardStyle(positions.get(venue.id), 0, `opacity ${FADE_OUT_MS}ms ${FADE_EASE}`, false);
                        }
                        else if (!oldRects.has(venue.id)) {
                            leaving[venue.id] = cardStyle(destinations.get(venue.id), 0, "none", false);
                        }
                        else {
                            leaving[venue.id] = pinned[venue.id];
                        }
                    }
                    // 独立渲染帧让 pin 的起始样式生效，避免微信桥接合并起止样式。
                    later(() => this.view.render({
                        venueList: union,
                        cardStyles: leaving,
                        listStyle,
                        filterAnimating: true,
                    }, () => {
                        if (!active())
                            return;
                        later(() => {
                            if (!target.length)
                                return finish();
                            const moveMs = returningToAll
                                ? MOVE_BACK_MS
                                : MOVE_UP_MS;
                            const moving = {};
                            for (const venue of target) {
                                moving[venue.id] = cardStyle(destinations.get(venue.id), 1, `transform ${moveMs}ms ${MOVE_EASE},opacity ${FADE_IN_MS}ms ${FADE_EASE}`, true, oldRects.has(venue.id));
                            }
                            this.view.render({
                                venueList: target,
                                cardStyles: moving,
                                listStyle,
                                filterAnimating: true,
                            }, () => {
                                if (active())
                                    later(finish, Math.max(moveMs, FADE_IN_MS) + 32);
                            });
                        }, hasExits ? FADE_OUT_MS : 32);
                    }), 32);
                });
            });
        });
    }
}
exports.VenueFilterMotion = VenueFilterMotion;
