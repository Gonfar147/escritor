import { createCanvas } from '@napi-rs/canvas';

/**
 * pdfjs-dist necesita un "canvas factory" para rasterizar páginas en Node (no hay
 * DOM). La opción clásica es el paquete `canvas` (node-canvas), que depende de
 * librerías nativas del sistema (Cairo/Pango/etc.) — poco confiable en un
 * buildpack de Render. `@napi-rs/canvas` es una implementación en Rust con
 * binarios precompilados por plataforma, sin esa dependencia del sistema, y
 * expone una API de Canvas 2D suficientemente compatible para esto.
 */
export class NapiCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext: { canvas: any; context: any }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: any; context: any }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}
