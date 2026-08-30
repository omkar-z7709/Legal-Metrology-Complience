import { IOcrProvider, OcrResult, OcrLine, OcrWord } from "./ocr.interface.js";

export class GoogleCloudVisionOcrProvider implements IOcrProvider {
  name = "google-cloud-vision" as const;
  private client: any = null;

  private async getClient() {
    if (this.client) return this.client;

    // Only instantiate if credentials explicitly exist
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      try {
        const vision = await import("@google-cloud/vision");
        this.client = new vision.default.ImageAnnotatorClient();
        return this.client;
      } catch {
        return null;
      }
    }
    return null;
  }

  async extractText(imageBuffer: Buffer): Promise<OcrResult> {
    const start = Date.now();
    const client = await this.getClient();

    if (!client) {
      throw new Error("Google Cloud Vision credentials not provided.");
    }

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    });

    const annotations = result.textAnnotations || [];
    if (annotations.length === 0) {
      return {
        rawText: "",
        averageConfidence: 1.0,
        lines: [],
        provider: "google-cloud-vision",
        processingTimeMs: Date.now() - start,
      };
    }

    const rawText = annotations[0].description || "";
    const lines: OcrLine[] = [];

    for (let i = 1; i < annotations.length; i++) {
      const item = annotations[i];
      const vertices = item.boundingPoly?.vertices || [];
      const x1 = vertices[0]?.x || 0;
      const y1 = vertices[0]?.y || 0;
      const x2 = vertices[2]?.x || x1 + 50;
      const y2 = vertices[2]?.y || y1 + 20;

      lines.push({
        text: item.description || "",
        confidence: item.confidence || 0.95,
        bbox: { x1, y1, x2, y2 },
        words: [
          {
            text: item.description || "",
            confidence: item.confidence || 0.95,
            bbox: { x1, y1, x2, y2 },
          },
        ],
      });
    }

    return {
      rawText,
      averageConfidence: 0.96,
      lines,
      provider: "google-cloud-vision",
      processingTimeMs: Date.now() - start,
    };
  }
}
