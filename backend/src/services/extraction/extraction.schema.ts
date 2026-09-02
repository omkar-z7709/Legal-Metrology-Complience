import { z } from "zod";

export const boundingBoxSchema = z
  .object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
  })
  .nullable()
  .optional();

export const declarationFieldSchema = z.object({
  value: z.string().nullable(),
  source_text: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  bbox: boundingBoxSchema,
});

export const netQuantityFieldSchema = declarationFieldSchema.extend({
  numeric_value: z.number().nullable().optional(),
  unit: z.string().nullable().optional(), // 'g', 'kg', 'ml', 'l', 'N', 'U'
});

export const mrpFieldSchema = declarationFieldSchema.extend({
  numeric_value: z.number().nullable().optional(),
  currency: z.string().nullable().optional(), // 'INR', 'Rs', '₹'
  is_inclusive_of_taxes: z.boolean().nullable().optional(),
  unit_sale_price: z.string().nullable().optional(),
});

export const dateFieldSchema = declarationFieldSchema.extend({
  month: z.string().nullable().optional(),
  year: z.string().nullable().optional(),
  raw_format: z.string().nullable().optional(),
});

export const consumerCareFieldSchema = declarationFieldSchema.extend({
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
});

export const structuredDeclarationsSchema = z.object({
  generic_name: declarationFieldSchema,
  manufacturer: declarationFieldSchema,
  packer: declarationFieldSchema,
  importer: declarationFieldSchema,
  net_quantity: netQuantityFieldSchema,
  mrp: mrpFieldSchema,
  date_of_manufacture: dateFieldSchema,
  consumer_care: consumerCareFieldSchema,
  country_of_origin: declarationFieldSchema,
  other_declarations: z.array(
    z.object({
      label: z.string(),
      value: z.string(),
      source_text: z.string().optional(),
    })
  ).default([]),
});

export type StructuredDeclarations = z.infer<typeof structuredDeclarationsSchema>;
