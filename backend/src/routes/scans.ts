import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { authenticate } from "../middleware/auth.js";
import { StorageService } from "../services/storage.service.js";
import { PreprocessService } from "../services/preprocess.service.js";
import { DBRepo } from "../db/repo.js";
import { OcrService } from "../services/ocr/ocr.service.js";

export const scanRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // 1. Upload Product Package Image & Initialize Inspection
  fastify.post(
    "/scans/upload",
    { preHandler: [authenticate] },
    async (request, reply) => {
      const files: {
        buffer: Buffer;
        filename: string;
        mimetype: string;
      }[] = [];

      let productName = "Unlabeled Commodity Sample";
      let category = "Packaged Food";
      let brand = "";
      let location = "Inspection Field Office";

      const parts = request.parts({
        limits: {
          fileSize: 20 * 1024 * 1024,
          files: 10,
        },
      });

      for await (const part of parts) {
        if (part.type === "file") {
          const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/jpg",
          ];

          if (!allowedMimeTypes.includes(part.mimetype)) {
            return reply.status(400).send({
              success: false,
              error: {
                code: "INVALID_FILE_TYPE",
                message: `Unsupported file format: ${part.mimetype}`,
              },
            });
          }

          const buffer = await part.toBuffer();

          files.push({
            buffer,
            filename: part.filename || `package_${files.length + 1}.jpg`,
            mimetype: part.mimetype,
          });
        } else {
          const value = part.value;

          if (part.fieldname === "productName") {
            productName = String(value);
          }

          if (part.fieldname === "category") {
            category = String(value);
          }

          if (part.fieldname === "brand") {
            brand = String(value);
          }

          if (part.fieldname === "location") {
            location = String(value);
          }
        }
      }

      console.log(
        `[UPLOAD] Received ${files.length} files:`,
        files.map((file) => file.filename),
      );

      if (files.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "FILE_MISSING",
            message: "At least one package image is required.",
          },
        });
      }

      // Continue with product + scan creation...

      const createdProduct = await DBRepo.insertProduct({
        name: productName,
        brand,
        category,
        commodityType: "Solid/Liquid",
      });

      const scanNumber = `INS-${new Date().getFullYear()}-${Math.floor(
        100000 + Math.random() * 900000,
      )}`;

      let inspectorId: string | undefined;

      if (request.user?.email) {
        const dbUser = await DBRepo.getUserByEmail(request.user.email);

        if (dbUser) {
          inspectorId = dbUser.id;
        }
      }

      const createdScan = await DBRepo.insertScan({
        productId: createdProduct.id,
        inspectorId,
        scanNumber,
        location,
        status: "PROCESSING",
        complianceStatus: "REQUIRES_REVIEW",
        complianceScore: "0.00",
      });

      // const storedImages = [];

      // for (const image of processedImages) {
      //   const originalUpload = await StorageService.uploadFile(
      //     image.buffer,
      //     `orig_${image.filename}`,
      //     image.mimetype,
      //     "scans/original",
      //   );

      //   const processedUpload = await StorageService.uploadFile(
      //     image.preprocessResult.processedBuffer,
      //     `prep_${image.filename}.jpg`,
      //     "image/jpeg",
      //     "scans/preprocessed",
      //   );

      //   const originalRecord = await DBRepo.insertImage({
      //     scanId: createdScan.id,
      //     imageType: "ORIGINAL",
      //     storagePath: originalUpload.storagePath,
      //     fileName: image.filename,
      //     contentType: image.mimetype,
      //     fileSizeBytes: image.buffer.length,
      //   });

      //   const processedRecord = await DBRepo.insertImage({
      //     scanId: createdScan.id,
      //     imageType: "PREPROCESSED",
      //     storagePath: processedUpload.storagePath,
      //     fileName: `preprocessed_${image.filename}`,
      //     contentType: "image/jpeg",
      //     fileSizeBytes: image.preprocessResult.processedBuffer.length,
      //     width: image.preprocessResult.width,
      //     height: image.preprocessResult.height,
      //   });

      //   storedImages.push({
      //     original: originalRecord,
      //     preprocessed: processedRecord,
      //   });
      // }

      const storedImages = await Promise.all(
        files.map(async (file) => {
          const upload = await StorageService.uploadFile(
            file.buffer,
            file.filename,
            file.mimetype,
            "scans/original",
          );

          return DBRepo.insertImage({
            scanId: createdScan.id,
            imageType: "ORIGINAL",
            storagePath: upload.storagePath,
            fileName: file.filename,
            contentType: file.mimetype,
            fileSizeBytes: file.buffer.length,
          });
        }),
      );

      return reply.status(201).send({
        success: true,
        data: {
          scanId: createdScan.id,
          scanNumber: createdScan.scanNumber,
          productId: createdProduct.id,
          images: storedImages,
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

      const imagesWithUrls = await Promise.all(
        scanImages.map(async (image: any) => ({
          ...image,
          url: await StorageService.getSignedUrl(
            image.storagePath,
            image.contentType,
          ),
        })),
      );
      const extractedFields = await DBRepo.getScanExtractedFields(scan.id);
      const complianceChecks = await DBRepo.getScanComplianceChecks(scan.id);
      const violations = await DBRepo.getScanViolations(scan.id);

      return reply.status(200).send({
        success: true,
        data: {
          scan,
          images: imagesWithUrls,
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

      const processedImages = scanImages.filter(
        (img) => img.imageType === "PREPROCESSED",
      );

      if (processedImages.length === 0) {
        return reply.status(400).send({
          success: false,
          error: {
            code: "NO_IMAGES",
            message: "No preprocessed images found.",
          },
        });
      }

      const ocrResults = [];

      for (const image of processedImages) {
        const imageBuffer = await StorageService.downloadFile(
          image.storagePath,
        );

        const result = await OcrService.extract(imageBuffer);

        ocrResults.push(result);
      }

      const combinedText = ocrResults
        .map(
          (result, index) =>
            `--- PACKAGE IMAGE ${index + 1} ---\n${result.rawText}`,
        )
        .join("\n\n");

      return reply.status(200).send({
        success: true,
        data: {
          scanId: scan.id,
          ocr: {
            rawText: combinedText,
            results: ocrResults,
          },
        },
      });

      // let imageBuffer: Buffer = Buffer.from("packaged_commodity_sample_image");
      // if (targetImage && targetImage.storagePath) {
      //   if (targetImage.storagePath.startsWith("local://")) {
      //     const localPath = targetImage.storagePath.replace("local://", "");
      //     try {
      //       const fs = await import("fs/promises");
      //       const path = await import("path");
      //       imageBuffer = await fs.readFile(
      //         path.resolve(process.cwd(), "uploads", localPath),
      //       );
      //     } catch {}
      //   }
      // }

      // // Execute OCR extraction
      // const { OcrService } = await import("../services/ocr/ocr.service.js");
      // const ocrResult = await OcrService.extract(imageBuffer);

      // return reply.status(200).send({
      //   success: true,
      //   data: {
      //     scanId: scan.id,
      //     ocr: ocrResult,
      //   },
      // });
    },
  );
};
