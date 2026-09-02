import { IOcrProvider, OcrResult } from "./ocr.interface.js";
import { GoogleCloudVisionOcrProvider } from "./google-vision.ocr.js";
import { TesseractOcrProvider } from "./tesseract.ocr.js";

export class OcrService {
  private static googleProvider = new GoogleCloudVisionOcrProvider();
  private static tesseractProvider = new TesseractOcrProvider();

  /**
   * Extracts text from packaging image using Google Cloud Vision SDK when credentials exist,
   * with automatic, resilient fallback to local Tesseract.js / synthetic OCR.
   */
  static async extract(imageBuffer: Buffer): Promise<OcrResult> {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      try {
        return await this.googleProvider.extractText(imageBuffer);
      } catch (err: any) {
        console.warn(
          `[OCR] Google Cloud Vision failed (${err.message}), falling back to local Tesseract.js`
        );
      }
    }

    // Resilient fallback to Tesseract.js / local OCR
    return await this.tesseractProvider.extractText(imageBuffer);
  }
}
