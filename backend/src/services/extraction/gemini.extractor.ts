import { GoogleGenAI } from "@google/genai";
import { OcrResult } from "../ocr/ocr.interface.js";
import {
  structuredDeclarationsSchema,
  StructuredDeclarations,
} from "./extraction.schema.js";

// const EXTRACTION_SYSTEM_PROMPT = `
// You are a Legal Metrology (Packaged Commodities) Rules, 2011 Extraction Specialist.
// Your task is to analyze OCR text extracted from a commodity package and extract mandatory declarations into structured JSON.

// CRITICAL RULES:
// 1. ONLY extract information that is explicitly stated in the OCR text.
// 2. If a declaration (e.g. consumer care, date of manufacture, country of origin, packer) is ABSENT or NOT FOUND, you MUST set "value": null and "source_text": null.
// 3. NEVER guess, assume, or invent missing information.
// 4. For MRP: extract numeric amount, check if 'incl. of all taxes' or 'inclusive of all taxes' is present.
// 5. For Net Quantity: extract standard metric unit (e.g. '1 L', '500 g', '200 ml', '1 kg', '10 N').
// 6. For Date of Manufacture: extract month and year (e.g., '08/2026', 'August 2026').
// 7. Return ONLY pure valid JSON matching the required schema.
// `;

const EXTRACTION_SYSTEM_PROMPT = `
You are a Legal Metrology (Packaged Commodities) Rules, 2011 Extraction Specialist.

Your task is to analyze OCR text extracted from a packaged commodity and extract mandatory declarations into the EXACT JSON structure specified below.

IMPORTANT RULES:

1. ONLY extract information explicitly present in the OCR text.
2. NEVER guess, infer, assume, or invent information.
3. If a declaration is absent or cannot be identified from the OCR text:
   - value must be null
   - source_text must be null
   - confidence must be 0
   - bbox must be null
4. Every declaration MUST contain:
   - value
   - source_text
   - confidence
   - bbox
5. confidence MUST always be a number between 0 and 1.
6. bbox should ALWAYS be null. Do not attempt to calculate bounding boxes from OCR text.
7. other_declarations MUST ALWAYS be an array.
8. If there are no other declarations, return [].
9. Return ONLY valid JSON. No markdown, explanations, or code fences.

EXTRACTION RULES:

MRP:
- Extract the numeric MRP amount.
- currency should normally be "INR".
- Set is_inclusive_of_taxes to true ONLY when the OCR explicitly contains wording such as:
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
    "bbox": null
  },

  "manufacturer": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null
  },

  "packer": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null
  },

  "importer": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null
  },

  "net_quantity": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null,
    "numeric_value": number | null,
    "unit": string | null
  },

  "mrp": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null,
    "numeric_value": number | null,
    "currency": string | null,
    "is_inclusive_of_taxes": boolean | null,
    "unit_sale_price": string | null
  },

  "date_of_manufacture": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null,
    "month": string | null,
    "year": string | null,
    "raw_format": string | null
  },

  "consumer_care": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null,
    "phone": string | null,
    "email": string | null,
    "address": string | null
  },

  "country_of_origin": {
    "value": string | null,
    "source_text": string | null,
    "confidence": number,
    "bbox": null
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
  "bbox": null
}

Return ONLY the JSON object.
`;

export class GeminiExtractor {
  private static ai: GoogleGenAI | null = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

  /**
   * Extracts structured legal declarations from OCR output using Gemini with Zod validation.
   */
  static async extractDeclarations(
    ocrResult: OcrResult,
  ): Promise<StructuredDeclarations> {
    const ocrText = ocrResult.rawText;

    // 1. If Gemini API key is available, attempt Gemini model with fast timeout
    if (this.ai && process.env.GEMINI_API_KEY) {
      try {
        //         const prompt = `
        // OCR TEXT FROM PRODUCT PACKAGE:
        // """
        // ${ocrText}
        // """

        // Extract all packaged commodity declarations according to Legal Metrology Rules, 2011.
        // Output strictly valid JSON with keys:
        // generic_name, manufacturer, packer, importer, net_quantity, mrp, date_of_manufacture, consumer_care, country_of_origin, other_declarations.
        // `;

        const prompt = `
OCR TEXT FROM PRODUCT PACKAGE:

"""
${ocrText}
"""

Extract the declarations from this OCR text.

Follow the exact JSON structure and extraction rules provided in the system instruction.
`;
        const callPromise = this.ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            systemInstruction: EXTRACTION_SYSTEM_PROMPT,
            responseMimeType: "application/json",
          },
        });

        const timeoutMs = Number(process.env.GEMINI_TIMEOUT_MS || 15000);

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () =>
              reject(new Error("Gemini request timeout (offline fallback)")),
            timeoutMs,
          ),
        );

        const response: any = await Promise.race([callPromise, timeoutPromise]);

        console.log("\n========== GEMINI RESPONSE ==========");
        console.dir(response, { depth: null });
        console.log("=====================================\n");

        const rawJsonText = response.text || "{}";
        console.log("\n========== GEMINI RAW TEXT ==========");
        console.log(rawJsonText);
        console.log("=====================================\n");

        const parsedJson = JSON.parse(rawJsonText);
        const validated = structuredDeclarationsSchema.parse(parsedJson);
        console.log("\n========== GEMINI VALIDATED ==========");
        console.dir(validated, { depth: null });
        console.log("======================================\n");
        return validated;
      } catch (err: any) {
        console.warn(
          `[Gemini Extraction] Notice: ${err.message}. Using deterministic fallback parser.`,
        );
      }
    }

    // 2. Deterministic Regex/Rule-Based Fallback Parser (Guarantees local execution without API keys)
    return this.deterministicFallbackExtract(ocrResult);
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
        // value: originMatch
        //   ? originMatch[1]?.trim()
        //   : text.toLowerCase().includes("india")
        //     ? "India"
        //     : null,
        // source_text: originMatch
        //   ? originMatch[0]
        //   : text.toLowerCase().includes("india")
        //     ? "India"
        //     : null,
        // confidence: originMatch
        //   ? 0.95
        //   : text.toLowerCase().includes("india")
        //     ? 0.85
        //     : 0.0,
        value: originMatch ? originMatch[1]?.trim() : null,
        source_text: originMatch ? originMatch[0] : null,
        confidence: originMatch ? 0.95 : 0.0,
        bbox: findBbox(/(?:Country\s*of\s*Origin|Made\s*in)/i),
      },
      other_declarations: [],
    };
  }
}
