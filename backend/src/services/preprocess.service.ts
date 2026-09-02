import sharp from "sharp";

export interface PreprocessResult {
  processedBuffer: Buffer;
  width: number;
  height: number;
  format: string;
  appliedTransformations: {
    name: string;
    rationale: string;
  }[];
}

export class PreprocessService {
  /**
   * Preprocesses commodity packaging images to maximize OCR character extraction accuracy.
   *
   * RATIONALE FOR APPLIED TRANSFORMATIONS:
   * 1. EXIF Auto-Rotation: Mobile cameras store rotation in metadata. Stripping and applying rotation
   *    ensures text lines are strictly horizontal for standard line-segmenting OCR algorithms.
   * 2. Bounded Scaling (max 2400px): Packaging text like MRP or Net Qty is often small. Bounded scaling
   *    preserves glyph clarity while preventing memory exhaustion on 48MP mobile captures.
   * 3. CLAHE Contrast Equalization: Packaging is frequently glossy (plastic pouches, bottles).
   *    Adaptive histogram equalization removes glare hotspots without blowing out light text on dark backgrounds.
   * 4. Selective Edge Sharpening: Boosts high-frequency pixel transitions on micro-fonts (<8pt font size)
   *    required under Rule 8.
   */
  static async preprocess(imageBuffer: Buffer): Promise<PreprocessResult> {
    const appliedTransformations = [
      {
        name: "EXIF Orientation Normalization",
        rationale: "Corrects camera tilt and aligns text baseline horizontally for OCR line segmentation.",
      },
      {
        name: "High-DPI Bounded Rescaling (2400px)",
        rationale: "Maintains optimal 300+ DPI equivalent font clarity while bounding peak memory usage.",
      },
      {
        name: "CLAHE Contrast Enhancement",
        rationale: "Compensates for plastic wrapping reflections, glare, and uneven retail store lighting.",
      },
      {
        name: "Unsharp Mask Edge Accentuator",
        rationale: "Sharpens fine font stroke boundaries to distinguish difficult numbers (e.g., 8 vs 3, 6 vs 5).",
      },
    ];

    try {
      // Execute sharp image pipeline
      const pipeline = sharp(imageBuffer)
        .rotate() // Auto-rotate via EXIF
        .resize(2400, 2400, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .clahe({
          width: 30,
          height: 30,
          maxSlope: 3,
        })
        .sharpen({
          sigma: 1.0,
          m1: 1.0,
          m2: 2.0,
        })
        .jpeg({ quality: 92 });

      const processedBuffer = await pipeline.toBuffer();
      const metadata = await sharp(processedBuffer).metadata();

      return {
        processedBuffer,
        width: metadata.width || 1200,
        height: metadata.height || 1200,
        format: metadata.format || "jpeg",
        appliedTransformations,
      };
    } catch (err: any) {
      // If image processing fails on invalid format, fallback gracefully to original
      const metadata = await sharp(imageBuffer).metadata().catch(() => ({ width: 800, height: 800, format: "jpeg" }));
      return {
        processedBuffer: imageBuffer,
        width: metadata.width || 800,
        height: metadata.height || 800,
        format: metadata.format || "jpeg",
        appliedTransformations: [
          {
            name: "Pass-Through Fallback",
            rationale: "Original image retained due to processing fallback.",
          },
        ],
      };
    }
  }
}
