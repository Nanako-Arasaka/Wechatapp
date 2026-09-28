"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QRCodeGenerator = void 0;
const qrcode = require("./vendor/qrcode-generator");
class QRCodeGenerator {
    static draw(canvasId, text, width, height, componentInstance) {
        if (!text)
            throw new Error('核销码为空');
        const code = qrcode(0, 'M');
        code.addData(text);
        code.make();
        const ctx = componentInstance
            ? wx.createCanvasContext(canvasId, componentInstance)
            : wx.createCanvasContext(canvasId);
        const count = code.getModuleCount();
        // 四个模块的静区和整数像素边界保证小尺寸二维码可扫描。
        const cellSize = Math.floor(Math.min(width, height) / (count + 8));
        if (cellSize < 1)
            throw new Error('二维码画布尺寸不足');
        const left = Math.floor((width - count * cellSize) / 2);
        const top = Math.floor((height - count * cellSize) / 2);
        ctx.setFillStyle('#FFFFFF');
        ctx.fillRect(0, 0, width, height);
        ctx.setFillStyle('#000000');
        for (let row = 0; row < count; row++) {
            for (let col = 0; col < count; col++) {
                if (code.isDark(row, col))
                    ctx.fillRect(left + col * cellSize, top + row * cellSize, cellSize, cellSize);
            }
        }
        ctx.draw();
    }
}
exports.QRCodeGenerator = QRCodeGenerator;
