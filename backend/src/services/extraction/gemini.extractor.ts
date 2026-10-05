import { GoogleGenAI } from "@google/genai";
import { OcrResult } from "../ocr/ocr.interface.js";
import {
  structuredDeclarationsSchema,
  StructuredDeclarations,
} from "./extraction.schema.js";

const EXTRACTION_SYSTEM_PROMPT = `
You are a Legal Metrology (Packaged Commodities) Rules, 2011 Extraction Specialist.

Your task is to analyze IMAGES of a packaged commodity label (plus any supporting OCR text) and extract mandatory declarations into the EXACT JSON structure specified below.

IMPORTANT RULES:

1. ONLY extract information you can actually SEE on the label image or that is explicitly present in the OCR text.
2. NEVER guess, infer, assume, or invent information.
3. Read the IMAGES as the primary source of truth. The OCR text is a noisy, partial aid only; it frequently misreads digits and letters (for example "Rs, 05/-" for "Rs. 25/-"). Where the image and the OCR text disagree, TRUST THE IMAGE.
4. If a declaration is absent or cannot be confidently identified:
   - value must be null
   - source_text must be null
   - confidence must be 0
   - bbox must be null
5. Every declaration MUST contain:
   - value
   - source_text
   - confidence
   - bbox
6. confidence MUST always be a number between 0 and 1.
7. BOUNDING BOXES (critical for Rule 7 placement and Rule 8 font-size checks):
   - When a declaration IS found on the image, return its bbox as a tight box around that printed text.
   - Use NORMALISED integer coordinates on a 0-1000 scale for BOTH axes: 0 = top/left edge, 1000 = bottom/right edge, regardless of the real image resolution.
   - Format: {"x1": int, "y1": int, "x2": int, "y2": int} with x2 > x1 and y2 > y1.
   - Return bbox: null ONLY when the declaration is absent (value is null).
   - Never fabricate a bounding box for a declaration you did not actually locate.
8. other_declarations MUST ALWAYS be an array.
9. If there are no other declarations, return [].
10. Return ONLY valid JSON. No markdown, explanations, or code fences.

EXTRACTION RULES:

MRP:
- Extract the numeric MRP amount.
- currency should normally be "INR".
- Set is_inclusive_of_taxes to true ONLY when the label explicitly shows wording such as:
  "incl. of all taxes"
  "inclusive of all taxes"
  "inclusive of taxes"
- If such wording is not present, set is_inclusive_of_taxes to false.
- Do not guess the MRP.

NET QUANTITY:
- Extract the numeric quantity and unit.
- Examples: "1 L", "500 g", "200 ml", "1 kg", "10 N".
- numeric_value must contain only the numeric quantity.
- unit must contain only the unit.

DATE OF MANUFACTURE:
- Extract only when explicitly stated.
- Examples:
  "Mfg Date: 08/2026"
  "Manufactured: August 2026"
  "Month & Year: 08/2026"
- Do not infer manufacturing date from expiry date.
- raw_format should contain the date exactly as shown.
- month and year may be null if they cannot be reliably separated.

DATE OF EXPIRY:
- Extract only when explicitly stated.
- Examples:
  "Exp Date: 08/2028"
  "Expiry: August 2028"
  "Use By: 07/2028"
  "Best Before: 08/2028"
- Do not infer, guess, or assume an expiry date.
- raw_format should contain the date exactly as shown.
- month and year may be null if they cannot be reliably separated.

CONSUMER CARE:
- Extract phone number, email and/or address only when explicitly present.
- Do not invent contact information.

COUNTRY OF ORIGIN:
- Extract only when explicitly associated with:
  "Made in"
  "Country of Origin"
  or equivalent wording.
- Do NOT infer country of origin merely because a country name appears elsewhere in the OCR.

MANUFACTURER:
- Extract only when explicitly associated with wording such as:
  "Manufactured by"
  "Mfd by"
  "Manufactured & Marketed by"

PACKER:
- Extract only when explicitly associated with wording such as:
  "Packed by"
  "Packer"

IMPORTER:
- Extract only when explicitly associated with wording such as:
  "Imported by"
  "Importer"

CONFIDENCE:
- confidence is an extraction confidence score, NOT a legal compliance score.
- Clearly readable explicit declarations may use values around 0.90-1.00.
- Partially ambiguous OCR should use a lower value.
- Missing declarations MUST use 0.

EXACT JSON STRUCTURE:

{
  "generic_name": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null
  },

  "manufacturer": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null
  },

  "packer": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null
  },

  "importer": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null
  },

  "net_quantity": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null,
    "numeric_value": number | null,
    "unit": string | null
  },

  "mrp": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null,
    "numeric_value": number | null,
    "currency": string | null,
    "is_inclusive_of_taxes": boolean | null,
    "unit_sale_price": string | null
  },

  "date_of_manufacture": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null,
    "month": string | null,
    "year": string | null,
    "raw_format": string | null
  },

  "date_of_expiry": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null,
    "month": string | null,
    "year": string | null,
    "raw_format": string | null
  },

  "consumer_care": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null,
    "phone": string | null,
    "email": string | null,
    "address": string | null
  },

  "country_of_origin": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null
  },

  "other_declarations": [
    {
      "label": string,
      "value": string,
      "source_text": string
    }
  ]
}

For missing declarations, use this pattern:

{
  "value": null,
  "source_text": null,
  "confidence": 0,
  "bbox": { "x1": int, "y1": int, "x2": int, "y2": int } | null
}

Return ONLY the JSON object.
`;

export interface ExtractionInput {
  /** OCR text is a noisy aid; the images are the source of truth. */
  ocrText: string;
  /** Preprocessed package images to send to Gemini as real vision input. */
  images?: { buffer: Buffer; mimeType: string }[];
}

export interface ExtractionProvenance {
  engine: "gemini-vision" | "regex-fallback";
  model?: string;
  imageCount: number;
  ocrProvider?: string;
  attempts: number;
  degraded: boolean;
  reason?: string;
}

export interface ExtractionResult {
  declarations: StructuredDeclarations;
  provenance: ExtractionProvenance;
}

/** Models verified to serve vision+JSON on this project. Ordered by preference. */
const MODEL_FALLBACK_CHAIN = [
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-2.5-flash-lite",
];

export class GeminiExtractor {
  // Lazily constructed: a static field initializer runs at module-load time, which
  // can be BEFORE dotenv has populated process.env, permanently pinning `ai` to null.
  private static _ai: GoogleGenAI | null | undefined;

  private static get ai(): GoogleGenAI | null {
    if (this._ai === undefined) {
      const key = process.env.GEMINI_API_KEY;
      this._ai = key ? new GoogleGenAI({ apiKey: key }) : null;
      if (!this._ai) {
        console.warn(
          "[GEMINI] GEMINI_API_KEY is not set - extraction will use degraded regex fallback.",
        );
      }
    }
    return this._ai;
  }

  private static get hasApiKey(): boolean {
    return !!this.ai;
  }

  private static get modelChain(): string[] {
    const configured = process.env.GEMINI_MODEL;
    return configured
      ? [configured, ...MODEL_FALLBACK_CHAIN.filter((m) => m !== configured)]
      : [...MODEL_FALLBACK_CHAIN];
  }

  /**
   * Extracts structured legal declarations from the package IMAGES (primary source of
   * truth) using Gemini vision, falling back to OCR-text regex parsing only when the
   * model is genuinely unreachable. Returns provenance so the UI never claims a
   * Gemini extraction that did not happen.
   */
  static async extractDeclarations(
    input: ExtractionInput | OcrResult,
  ): Promise<ExtractionResult> {
    // Backwards-compatible single-arg call sites.
    const { ocrText, images }: ExtractionInput =
      "rawText" in (input as OcrResult)
        ? { ocrText: (input as OcrResult).rawText, images: [] }
        : (input as ExtractionInput);

    const ocrProvider = "rawText" in (input as OcrResult)
      ? (input as OcrResult).provider
      : undefined;

    const imageCount = images?.length ?? 0;

    if (this.hasApiKey) {
      const chain = this.modelChain;
      let attempts = 0;
      const failures: string[] = [];

      // Run ONE request per package image. Sending several images in a single
      // request caused the model to drop declarations found on the other images
      // (e.g. net quantity on the front panel), and made a single normalised
      // bbox ambiguous as to which image it referred to.
      const perImage = images?.length
        ? images
        : [{ buffer: undefined as any, mimeType: "" }];
      const ocrChunks = this.splitOcrByImage(ocrText, perImage.length);

      const merged = this.emptyDeclarations();
      let usedModel: string | undefined;
      let succeeded = 0;

      outer: for (const modelName of chain) {
        for (let attempt = 0; attempt < Number(process.env.GEMINI_MAX_RETRIES || 4); attempt++) {
          attempts++;
          try {
            console.log(
              `[GEMINI] model='${modelName}' attempt=${attempt + 1} images=${perImage.length}`,
            );

            for (let i = 0; i < perImage.length; i++) {
              const img = perImage[i];
              const perImagePrompt = this.buildUserPrompt(
                ocrChunks[i] ?? "",
                Boolean(img.buffer),
              );
              const response: any = await this.callWithTimeout(
                modelName,
                perImagePrompt,
                img.buffer ? [img] : undefined,
              );

              let rawJsonText =
                typeof response.text === "function"
                  ? response.text()
                  : typeof response.text === "string"
                    ? response.text
                    : (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}");

              rawJsonText = rawJsonText
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();

              const parsedJson = JSON.parse(rawJsonText);
              const validated = structuredDeclarationsSchema.parse(parsedJson);
              GeminiExtractor.normalize(validated);
              this.mergeInto(merged, validated, i);
              succeeded++;
            }

            usedModel = modelName;
            console.log(
              `[GEMINI] extraction OK via '${modelName}' (${perImage.length} image(s), ${succeeded} parsed)`,
            );
            break outer;
          } catch (err: any) {
            const message = err?.message || "Unknown Gemini API error";
            const status = this.statusOf(err);
            const isFatal =
              status === 400 || status === 401 || status === 403 || status === 404;
            console.warn(
              `[GEMINI] ${modelName} failed (status=${status} attempt=${attempt + 1}): ${message}`,
            );
            failures.push(`${modelName}:${status}`);

            // Bad prompt/JSON shape or bad key -> this model will not recover.
            if (isFatal && status !== 404) break;

            // Exponential backoff with jitter, capped.
            const backoff = Math.min(8000, 500 * 2 ** attempt) + Math.random() * 250;
            await new Promise((r) => setTimeout(r, backoff));
          }
        }
      }

      if (usedModel) {
        return {
          declarations: merged,
          provenance: {
            engine: "gemini-vision",
            model: usedModel,
            imageCount,
            ocrProvider,
            attempts,
            degraded: false,
          },
        };
      }

      const reason = `Gemini unavailable after ${attempts} attempt(s): ${failures.join(", ")}`;
      console.warn(`[GEMINI] ${reason} -> degrading to OCR regex fallback`);
      return {
        declarations: this.deterministicFallbackExtract({
          rawText: ocrText,
          averageConfidence: 0,
          lines: [],
          provider: ocrProvider || "none",
          processingTimeMs: 0,
        }),
        provenance: {
          engine: "regex-fallback",
          imageCount,
          ocrProvider,
          attempts,
          degraded: true,
          reason,
        },
      };
    }

    // No API key configured at all.
    return {
      declarations: this.deterministicFallbackExtract({
        rawText: ocrText,
        averageConfidence: 0,
        lines: [],
        provider: ocrProvider || "none",
        processingTimeMs: 0,
      }),
      provenance: {
        engine: "regex-fallback",
        imageCount,
        ocrProvider,
        attempts: 0,
        degraded: true,
        reason: "GEMINI_API_KEY not configured",
      },
    };
  }

  private static buildUserPrompt(ocrText: string, hasImages: boolean): string {
    return `
You have been given ${hasImages ? "an image of a packaged commodity label" : "NO image"}.

The image is the authoritative source. The OCR text below is a noisy partial aid
(it commonly misreads digits and letters, e.g. "Rs, 05/-" for "Rs. 25/-").
Where they conflict, TRUST THE IMAGE.

${hasImages ? "" : "WARNING: No image was provided. Only use the OCR text.\n"}
OCR TEXT (noisy, untrustworthy for digits):
"""
${ocrText.slice(0, 6000) || "(no OCR text available)"}
"""

Extract every mandatory declaration you can actually see on this label.
Return a tight normalised (0-1000) bounding box for each declaration you locate.
Report a declaration ONLY if you can genuinely see it; otherwise use null.
`;
  }

  /**
   * Derives structured sub-fields the model may omit from a value it DID return.
   * This is parsing of observed text, not inference: "58 g" -> numeric_value 58,
   * unit "g". Without this, a correctly read declaration was reported as missing.
   */
  private static normalize(d: StructuredDeclarations): void {
    const qty: any = d.net_quantity;
    if (qty?.value && !qty.numeric_value) {
      const m = String(qty.value).match(
        /(\d+(?:\.\d+)?)\s*(kg|mg|g|ml|l|ltr|litre|liter|cl|dl|N|u|units?|tablets?|capsules?)\b/i,
      );
      if (m) {
        qty.numeric_value = parseFloat(m[1]);
        qty.unit = m[2].toLowerCase();
      }
    }

    const mrp: any = d.mrp;
    if (mrp?.value && !mrp.numeric_value) {
      const m = String(mrp.value).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
      if (m) {
        mrp.numeric_value = parseFloat(m[1]);
        mrp.currency = mrp.currency || "INR";
      }
    }
  }

  /** Splits the combined OCR blob back into per-image chunks. */
  private static splitOcrByImage(ocrText: string, count: number): string[] {
    if (count <= 1) return [ocrText];
    const parts = ocrText.split(/--- PACKAGE IMAGE \d+ ---/).slice(1);
    if (parts.length === count) return parts;
    return Array.from({ length: count }, () => ocrText);
  }

  private static emptyDeclarations(): StructuredDeclarations {
    const blank = () => ({
      value: null,
      source_text: null,
      confidence: 0,
      bbox: null,
      image_index: null,
    });
    return {
      generic_name: blank(),
      manufacturer: blank(),
      packer: blank(),
      importer: blank(),
      net_quantity: { ...blank(), numeric_value: null, unit: null },
      mrp: {
        ...blank(),
        numeric_value: null,
        currency: null,
        is_inclusive_of_taxes: null,
        unit_sale_price: null,
      },
      date_of_manufacture: { ...blank(), month: null, year: null, raw_format: null },
      date_of_expiry: { ...blank(), month: null, year: null, raw_format: null },
      consumer_care: { ...blank(), phone: null, email: null, address: null },
      country_of_origin: blank(),
      other_declarations: [],
    } as StructuredDeclarations;
  }

  /**
   * Merges one image's extraction into the aggregate. A declaration already found
   * on another image is kept unless the new value has strictly higher confidence.
   */
  private static mergeInto(
    target: StructuredDeclarations,
    incoming: StructuredDeclarations,
    imageIndex: number,
  ): void {
    for (const key of Object.keys(incoming) as (keyof StructuredDeclarations)[]) {
      if (key === "other_declarations") {
        const existing = (target.other_declarations ?? []).map((d) => d.label);
        for (const d of incoming.other_declarations ?? []) {
          if (!existing.includes(d.label)) target.other_declarations.push(d);
        }
        continue;
      }

      const next = incoming[key] as any;
      if (!next) continue;
      const current = target[key] as any;

      // Tag provenance so the normalised bbox can be mapped to its source image.
      next.image_index = next.bbox ? imageIndex : null;

      if (current.value && !next.value) continue;
      if (!current.value && next.value) {
        (target as any)[key] = next;
        continue;
      }
      if (next.confidence > current.confidence) {
        (target as any)[key] = next;
      }
    }
  }

  private static statusOf(err: any): number {
    const s = err?.status || err?.statusCode || err?.code;
    if (typeof s === "number") return s;
    const m = err?.message || "";
    if (m.includes("429")) return 429;
    if (m.includes("401")) return 401;
    if (m.includes("403")) return 403;
    if (m.includes("400")) return 400;
    if (m.includes("404")) return 404;
    if (m.includes("503")) return 503;
    return 500;
  }

  private static async callWithTimeout(
    modelName: string,
    prompt: string,
    images?: { buffer: Buffer; mimeType: string }[],
  ) {
    const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 90000);

    // REAL VISION INPUT: send the actual package image bytes alongside the prompt.
    const parts: any[] = [];
    for (const img of images ?? []) {
      parts.push({
        inlineData: {
          mimeType: img.mimeType,
          data: img.buffer.toString("base64"),
        },
      });
    }
    parts.push({ text: prompt });

    const callPromise = this.ai!.models.generateContent({
      model: modelName,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: EXTRACTION_SYSTEM_PROMPT,
        responseMimeType: "application/json",
        temperature: 0,
      },
    });

    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`Gemini request timeout after ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    try {
      return await Promise.race([callPromise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }

  /**
   * Deterministic regex-based fallback extractor for zero-hallucination baseline extraction
   */
  private static deterministicFallbackExtract(
    ocrResult: OcrResult,
  ): StructuredDeclarations {
    const text = ocrResult.rawText;

    // Generic Name
    const nameMatch =
      text.match(
        /(?:Product|Item|Commodity)?[:\s]*([A-Z0-9\s]{3,40}(?:OIL|RICE|HONEY|TEA|SOAP|ATTA|FLOUR|POWDER|SPICE|CREAM))/i,
      ) || text.split("\n").filter((l) => l.trim().length > 3)[0];
    const genericNameVal =
      typeof nameMatch === "string"
        ? nameMatch.trim()
        : nameMatch
          ? nameMatch[1]?.trim()
          : null;

    // MRP
    const mrpMatch = text.match(
      /(?:MRP|M\.R\.P\.|Max(?:imum)?\s*Retail\s*Price)[\s:.]*(?:Rs\.?|₹)?\s*(\d+(?:\.\d{1,2})?)/i,
    );
    const hasTaxes = /(?:incl(?:usive)?\.?\s*(?:of)?\s*(?:all)?\s*taxes)/i.test(
      text,
    );

    // Net Quantity
    const qtyMatch = text.match(
      /(?:Net\s*(?:Qty|Quantity|Wt|Weight|Volume))[\s:.]*(\d+(?:\.\d+)?)\s*(kg|g|ml|l|litre|liter|kg\.|g\.|ml\.|l\.|N|units?)/i,
    );

    // Date of Manufacture
    const dateMatch = text.match(
      /(?:Mfg\.?\s*(?:Date|Dt)?|Date\s*of\s*Mfg|Packed\s*(?:Date|Dt)?|Month\s*&\s*Year)[\s:.]*([0-1]?\d[\/-]20\d{2}|[a-zA-Z]{3,9}\s*20\d{2})/i,
    );

    // Date of Expiry
    const expiryMatch = text.match(
      /(?:Exp(?:iry)?\s*(?:Date|Dt)?|Use\s*By|Best\s*Before|Best-before|Best\s*Before\s*Date)[\s:.]*([0-3]?\d[\/-][0-1]?\d[\/-]20\d{2}|[0-1]?\d[\/-]20\d{2}|[a-zA-Z]{3,9}\s*20\d{2})/i,
    );

    // Consumer Care
    const phoneMatch = text.match(
      /(?:Consumer\s*Care|Customer\s*Care|Helpline|Toll\s*Free|Grievance)[\s:a-zA-Z0-9|•-]*?([1-9][0-9]{3,4}[-\s]?[0-9]{3,7}|1800[-\s]?[0-9]{3,4}(?:[-\s]?[0-9]{3,4})?)/i,
    );
    const emailMatch = text.match(
      /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/,
    );

    // Manufacturer
    const mfgMatch = text.match(
      /(?:Mfd\.?\s*by|Manufactured\s*by|Packed\s*by|Mfg\s*by)[:\s]*([^\n,]+(?:Ltd|Pvt|Enterprises|Foods|Agro|Industries|Corp|LLP)?)/i,
    );

    // Country of origin
    const originMatch = text.match(
      /(?:Country\s*of\s*Origin|Made\s*in)[:\s]*([a-zA-Z]+)/i,
    );

    // Helper to find bounding box of a line matching a pattern
    const findBbox = (pattern: RegExp) => {
      const matchedLine = ocrResult.lines.find((l) => pattern.test(l.text));
      return matchedLine?.bbox || null;
    };

    return {
      generic_name: {
        value: genericNameVal || null,
        source_text: genericNameVal || null,
        confidence: 0.94,
        bbox:
          findBbox(
            /(?:OIL|RICE|HONEY|TEA|SOAP|ATTA|FLOUR|POWDER|SPICE|CREAM|PACKET)/i,
          ) ||
          ocrResult.lines[0]?.bbox ||
          null,
      },
      manufacturer: {
        value: mfgMatch ? mfgMatch[1]?.trim() : null,
        source_text: mfgMatch ? mfgMatch[0]?.trim() : null,
        confidence: mfgMatch ? 0.96 : 0.0,
        bbox: findBbox(/(?:Mfd|Manufactured|Packed|Mfg)\s*by/i),
      },
      packer: {
        value: null,
        source_text: null,
        confidence: 0.0,
        bbox: null,
      },
      importer: {
        value: null,
        source_text: null,
        confidence: 0.0,
        bbox: null,
      },
      net_quantity: {
        value: qtyMatch ? `${qtyMatch[1]} ${qtyMatch[2]}` : null,
        numeric_value: qtyMatch ? parseFloat(qtyMatch[1]) : null,
        unit: qtyMatch ? qtyMatch[2].toLowerCase() : null,
        source_text: qtyMatch ? qtyMatch[0] : null,
        confidence: qtyMatch ? 0.98 : 0.0,
        bbox: findBbox(/(?:Net\s*(?:Qty|Quantity|Wt|Weight|Volume))/i),
      },
      mrp: {
        value: mrpMatch ? `₹${mrpMatch[1]}` : null,
        numeric_value: mrpMatch ? parseFloat(mrpMatch[1]) : null,
        currency: "INR",
        is_inclusive_of_taxes: hasTaxes,
        unit_sale_price: null,
        source_text: mrpMatch ? mrpMatch[0] : null,
        confidence: mrpMatch ? 0.97 : 0.0,
        bbox: findBbox(/(?:MRP|M\.R\.P\.|Max(?:imum)?\s*Retail\s*Price)/i),
      },
      date_of_manufacture: {
        value: dateMatch ? dateMatch[1] : null,
        raw_format: dateMatch ? dateMatch[1] : null,
        source_text: dateMatch ? dateMatch[0] : null,
        confidence: dateMatch ? 0.92 : 0.0,
        bbox: findBbox(
          /(?:Mfg\.?\s*(?:Date|Dt)?|Date\s*of\s*Mfg|Packed\s*(?:Date|Dt)?|Month\s*&\s*Year)/i,
        ),
      },
      date_of_expiry: {
        value: expiryMatch ? expiryMatch[1] : null,
        raw_format: expiryMatch ? expiryMatch[1] : null,
        source_text: expiryMatch ? expiryMatch[0] : null,
        confidence: expiryMatch ? 0.92 : 0.0,
        bbox: findBbox(
          /(?:Exp(?:iry)?\s*(?:Date|Dt)?|Use\s*By|Best\s*Before|Best-before|Best\s*Before\s*Date)/i,
        ),
      },
      consumer_care: {
        value:
          phoneMatch || emailMatch
            ? `${phoneMatch ? phoneMatch[1] : ""} ${emailMatch ? emailMatch[1] : ""}`.trim()
            : null,
        phone: phoneMatch ? phoneMatch[1] : null,
        email: emailMatch ? emailMatch[1] : null,
        address: null,
        source_text: phoneMatch
          ? phoneMatch[0]
          : emailMatch
            ? emailMatch[0]
            : null,
        confidence: phoneMatch || emailMatch ? 0.93 : 0.0,
        bbox: findBbox(
          /(?:Consumer\s*Care|Customer\s*Care|Helpline|Toll\s*Free|Grievance)/i,
        ),
      },
      country_of_origin: {
        value: originMatch ? originMatch[1]?.trim() : null,
        source_text: originMatch ? originMatch[0] : null,
        confidence: originMatch ? 0.95 : 0.0,
        bbox: findBbox(/(?:Country\s*of\s*Origin|Made\s*in)/i),
      },
      other_declarations: [],
    };
  }
}
