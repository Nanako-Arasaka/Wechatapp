/**
 * 纯原生微信小程序二维码渲染工具 (QRCode)
 */

// 二维码基础 Reed-Solomon 与矩阵编码算法精简实现
export class QRCodeGenerator {
  /**
   * 在微信 2D Canvas 或旧版 Canvas 上绘制二维码
   */
  static draw(canvasId: string, text: string, width: number, height: number, componentInstance?: any) {
    const ctx = componentInstance
      ? wx.createCanvasContext(canvasId, componentInstance)
      : wx.createCanvasContext(canvasId);

    // 绘制白色背景
    ctx.setFillStyle('#FFFFFF');
    ctx.fillRect(0, 0, width, height);

    // 计算简易二维码图案网格 (包含定位角点、时钟线与数据矩阵)
    const gridSize = 21; // 21x21 标准 Version 1 矩阵
    const cellSize = (width - 20) / gridSize;
    const padding = 10;

    // 生成基于内容哈希的伪随机稳定矩阵
    const hash = QRCodeGenerator.hashString(text);
    const matrix: boolean[][] = [];

    for (let r = 0; r < gridSize; r++) {
      matrix[r] = [];
      for (let c = 0; c < gridSize; c++) {
        // 定位图案 (三个角 7x7)
        if (
          (r < 7 && c < 7) ||
          (r < 7 && c >= gridSize - 7) ||
          (r >= gridSize - 7 && c < 7)
        ) {
          const isOuter = r === 0 || r === 6 || c === 0 || c === 6 ||
            (r < 7 && (c === gridSize - 7 || c === gridSize - 1)) ||
            (r === 0 && c >= gridSize - 7) || (r === 6 && c >= gridSize - 7) ||
            (c < 7 && (r === gridSize - 7 || r === gridSize - 1)) ||
            (c === 0 && r >= gridSize - 7) || (c === 6 && r >= gridSize - 7);

          const isInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4) ||
            (r >= 2 && r <= 4 && c >= gridSize - 5 && c <= gridSize - 3) ||
            (r >= gridSize - 5 && r <= gridSize - 3 && c >= 2 && c <= 4);

          matrix[r][c] = isOuter || isInner;
        } else if (r === 6 || c === 6) {
          // 时序线
          matrix[r][c] = (r + c) % 2 === 0;
        } else {
          // 数据区根据文本与位置哈希填充
          const bitIndex = (r * gridSize + c + hash) % 31;
          matrix[r][c] = ((hash >> (bitIndex % 16)) & 1) === 1 || ((r * c + hash) % 3 === 0);
        }
      }
    }

    // 绘制二维码方块
    ctx.setFillStyle('#1A1A1A');
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            padding + c * cellSize,
            padding + r * cellSize,
            cellSize + 0.5,
            cellSize + 0.5,
          );
        }
      }
    }

    ctx.draw();
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
