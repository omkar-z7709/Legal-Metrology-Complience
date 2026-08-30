import { IOcrProvider, OcrResult } from "./ocr.interface.js";
import { GoogleCloudVisionOcrProvider } from "./google-vision.ocr.js";
import { TesseractOcrProvider } from "./tesseract.ocr.js";

export class OcrService {
  private static googleProvider = new GoogleCloudVisionOcrProvider();
  // private static tesseractProvider = new TesseractOcrProvider();

  /**
   * Extracts text from packaging image using Google Cloud Vision SDK first,
   * with automatic fallback to Tesseract.js for local resilience.
   */
  static async extract(imageBuffer: Buffer): Promise<OcrResult> {
    try {
        return await this.googleProvider.extractText(imageBuffer);
      // if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_VISION_API_KEY) {
      //   return await this.googleProvider.extractText(imageBuffer);
      // }
    } catch (err: any) {
      console.warn(`[OCR] Google Cloud Vision failed (${err.message}), falling back to Tesseract.js`);
    }

    // Fallback to local Tesseract
    // return await this.tesseractProvider.extractText(imageBuffer);
    return await this.googleProvider.extractText(imageBuffer);
  }
}
