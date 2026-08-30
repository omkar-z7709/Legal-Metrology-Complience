import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { StorageService } from "../services/storage.service.js";
import { PreprocessService } from "../services/preprocess.service.js";
import { DBRepo } from "../db/repo.js";

export const scanRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. Upload Product Package Image & Initialize Inspection
  fastify.post(
    "/scans/upload",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const data = await request.file({
        limits: {
          fileSize: 20 * 1024 * 1024, // 20 MB max
        },
      });

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "FILE_MISSING",
            message: "No image file provided in multipart payload.",
          },
        });
      }

      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
      ];
      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "INVALID_FILE_TYPE",
            message: `Unsupported file format: ${data.mimetype}. Allowed: JPEG, PNG, WebP.`,
          },
        });
      }

      const fileBuffer = await data.toBuffer();
      const originalFileName = data.filename || "package_image.jpg";
      const fileSizeBytes = fileBuffer.length;

      // Optional metadata from fields
      const fields: any = data.fields;
      const productName =
        fields?.productName?.value || "Unlabeled Commodity Sample";
      const category = fields?.category?.value || "Packaged Food";
      const brand = fields?.brand?.value || "Standard Brand";
      const location = fields?.location?.value || "Inspection Field Office";

      // 1. Preprocess Image for OCR optimization
      const preprocessResult = await PreprocessService.preprocess(fileBuffer);

      // 2. Upload Original & Preprocessed Images
      const originalUpload = await StorageService.uploadFile(
        fileBuffer,
        `orig_${originalFileName}`,
        data.mimetype,
        "scans/original",
      );

      const processedUpload = await StorageService.uploadFile(
        preprocessResult.processedBuffer,
        `prep_${originalFileName}.jpg`,
        "image/jpeg",
        "scans/preprocessed",
      );

      // 3. Create Product Record via DBRepo
      const createdProduct = await DBRepo.insertProduct({
        name: productName,
        brand,
        category,
        commodityType: "Solid/Liquid",
      });

      // 4. Create Scan Record
      const scanNumber = `INS-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      const createdScan = await DBRepo.insertScan({
        productId: createdProduct.id,
        inspectorId:
          request.user?.id && request.user.id.includes("-")
            ? request.user.id
            : undefined,
        scanNumber,
        location,
        status: "PROCESSING",
        complianceStatus: "REQUIRES_REVIEW",
        complianceScore: "0.00",
      });

      // 5. Store Image Records
      await DBRepo.insertImage({
        scanId: createdScan.id,
        imageType: "ORIGINAL",
        storagePath: originalUpload.storagePath,
        fileName: originalFileName,
        contentType: data.mimetype,
        fileSizeBytes,
      });

      await DBRepo.insertImage({
        scanId: createdScan.id,
        imageType: "PREPROCESSED",
        storagePath: processedUpload.storagePath,
        fileName: `preprocessed_${originalFileName}`,
        contentType: "image/jpeg",
        fileSizeBytes: preprocessResult.processedBuffer.length,
        width: preprocessResult.width,
        height: preprocessResult.height,
      });

      return reply.status(201).send({
        success: true,
        data: {
          scanId: createdScan.id,
          scanNumber: createdScan.scanNumber,
          productId: createdProduct.id,
          productName: createdProduct.name,
          status: createdScan.status,
          images: {
            original: {
              storagePath: originalUpload.storagePath,
              url: originalUpload.signedUrl,
              sizeBytes: fileSizeBytes,
            },
            preprocessed: {
              storagePath: processedUpload.storagePath,
              url: processedUpload.signedUrl,
              width: preprocessResult.width,
              height: preprocessResult.height,
              transformations: preprocessResult.appliedTransformations,
            },
          },
        },
      });
    },
  );

  // 2. Get Scan by ID
  fastify.get(
    "/scans/:id",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const scan = await DBRepo.getScan(id);
      if (!scan) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "SCAN_NOT_FOUND",
            message: `Scan with ID '${id}' does not exist.`,
          },
        });
      }

      const scanImages = await DBRepo.getScanImages(scan.id);
      const extractedFields = await DBRepo.getScanExtractedFields(scan.id);
      const complianceChecks = await DBRepo.getScanComplianceChecks(scan.id);
      const violations = await DBRepo.getScanViolations(scan.id);

      return reply.status(200).send({
        success: true,
        data: {
          scan,
          images: scanImages,
          analysis: scan.analysis || null,

          extractedFields,
          complianceChecks,
          violations,
        },
      });
    },
  );

  // 3. List Recent Scans
  fastify.get(
    "/scans",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const scanList = await DBRepo.getAllScans();

      return reply.status(200).send({
        success: true,
        data: {
          scans: scanList,
          count: scanList.length,
        },
      });
    },
  );

  // 4. Execute & Retrieve OCR for Scan (Module 5)
  fastify.post(
    "/scans/:id/ocr",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      const scan = await DBRepo.getScan(id);
      if (!scan) {
        return reply.status(404).send({
          success: false,
          error: {
            code: "SCAN_NOT_FOUND",
            message: `Scan with ID '${id}' does not exist.`,
          },
        });
      }

      const scanImages = await DBRepo.getScanImages(scan.id);
      const targetImage =
        scanImages.find((img) => img.imageType === "PREPROCESSED") ||
        scanImages[0];

      // Read image buffer from storage or create placeholder buffer
      let imageBuffer: Buffer = Buffer.from("packaged_commodity_sample_image");
      if (targetImage && targetImage.storagePath) {
        if (targetImage.storagePath.startsWith("local://")) {
          const localPath = targetImage.storagePath.replace("local://", "");
          try {
            const fs = await import("fs/promises");
            const path = await import("path");
            imageBuffer = await fs.readFile(
              path.resolve(process.cwd(), "uploads", localPath),
            );
          } catch {}
        }
      }

      // Execute OCR extraction
      const { OcrService } = await import("../services/ocr/ocr.service.js");
      const ocrResult = await OcrService.extract(imageBuffer);

      return reply.status(200).send({
        success: true,
        data: {
          scanId: scan.id,
          ocr: ocrResult,
        },
      });
    },
  );
};
