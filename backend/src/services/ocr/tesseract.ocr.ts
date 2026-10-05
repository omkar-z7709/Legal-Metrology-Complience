import { IOcrProvider, OcrResult, OcrLine, OcrWord } from "./ocr.interface.js";

export class TesseractOcrProvider implements IOcrProvider {
  name = "tesseract" as const;

  /**
   * tesseract.js v6 moved the line/word hierarchy under
   * `data.blocks[].paragraphs[].lines[].words[]`. The legacy top-level
   * `data.lines` / `data.words` are always undefined in v6, which previously
   * produced zero bounding boxes and made every Rule 7 placement check fail.
   */
  private static collectLines(data: any): OcrLine[] {
    const raw: any[] = Array.isArray(data?.lines)
      ? data.lines
      : (data?.blocks ?? [])
          .flatMap((b: any) => b?.paragraphs ?? [])
          .flatMap((p: any) => p?.lines ?? []);

    return raw
      .map((line: any) => {
        const bbox = line.bbox
          ? { x1: line.bbox.x0, y1: line.bbox.y0, x2: line.bbox.x1, y2: line.bbox.y1 }
          : undefined;

        const words: OcrWord[] = (line.words ?? []).map((w: any) => ({
          text: w.text,
          confidence: typeof w.confidence === "number" ? w.confidence / 100 : 0.9,
          bbox: w.bbox
            ? { x1: w.bbox.x0, y1: w.bbox.y0, x2: w.bbox.x1, y2: w.bbox.y1 }
            : undefined,
        }));

        return {
          text: (line.text ?? "").trim(),
          confidence: typeof line.confidence === "number" ? line.confidence / 100 : 0.9,
          bbox,
          words,
        };
      })
      .filter((l: OcrLine) => l.text.length > 0);
  }

  async extractText(imageBuffer: Buffer): Promise<OcrResult> {
    const start = Date.now();

    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    let data: any;

    try {
      // blocks:true is required in v6 to get the line/word hierarchy with boxes.
      const ret = await worker.recognize(imageBuffer, {}, { blocks: true, text: true });
      data = ret.data;
    } finally {
      await worker.terminate();
    }

    const lines = TesseractOcrProvider.collectLines(data);
    const rawText = (data?.text ?? "").trim();

    return {
      rawText,
      averageConfidence:
        typeof data?.confidence === "number" ? data.confidence / 100 : 0,
      lines,
      provider: "tesseract",
      processingTimeMs: Date.now() - start,
    };
  }
}
