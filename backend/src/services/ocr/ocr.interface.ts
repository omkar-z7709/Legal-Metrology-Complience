export interface OcrBoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox?: OcrBoundingBox;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox?: OcrBoundingBox;
  words: OcrWord[];
}

export interface OcrResult {
  rawText: string;
  averageConfidence: number;
  lines: OcrLine[];
  provider: "google-cloud-vision" | "tesseract" | "synthetic";
  processingTimeMs: number;
}

export interface IOcrProvider {
  name: string;
  extractText(imageBuffer: Buffer): Promise<OcrResult>;
}
