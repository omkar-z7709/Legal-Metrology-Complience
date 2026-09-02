import { IOcrProvider, OcrResult, OcrLine } from "./ocr.interface.js";

export class GoogleCloudVisionOcrProvider implements IOcrProvider {
  name = "google-cloud-vision" as const;

  async extractText(imageBuffer: Buffer): Promise<OcrResult> {
    const start = Date.now();
    const apiKey = process.env.GOOGLE_CLOUD_VISION_API_KEY;

    // 1. If API Key is configured, use Google Cloud Vision REST endpoint (cleanest, no ADC issues)
    if (apiKey) {
      const base64Image = imageBuffer.toString("base64");
      const url = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64Image },
              features: [{ type: "TEXT_DETECTION" }],
            },
          ],
        }),
      });

      if (!res.ok) {
        throw new Error(`Google Vision API error: ${res.status} ${await res.text()}`);
      }

      const data: any = await res.json();
      const response = data.responses?.[0] || {};
      const annotations = response.textAnnotations || [];

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

    // 2. If Service Account ADC credentials file is configured
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const vision = await import("@google-cloud/vision");
      const client = new vision.default.ImageAnnotatorClient();

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

    throw new Error("No Google Cloud Vision credentials or API key configured.");
  }
}
