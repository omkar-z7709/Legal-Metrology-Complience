import { supabaseAdmin } from "../db/supabase.js";
import fs from "fs/promises";
import path from "path";

const BUCKET_NAME = "commodity-scans";
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), "uploads");

// Ensure local fallback storage exists
async function ensureLocalDir() {
  try {
    await fs.mkdir(LOCAL_STORAGE_DIR, { recursive: true });
  } catch {}
}

export interface UploadResult {
  storagePath: string;
  signedUrl: string;
  storageProvider: "supabase" | "local";
}

export class StorageService {
  /**
   * Uploads file buffer to Supabase Storage with local fallback
   */
  static async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    folder: string = "scans"
  ): Promise<UploadResult> {
    const storagePath = `${folder}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

    try {
      // 1. Attempt Supabase Storage upload
      const { data, error } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        });

      if (!error && data) {
        // Generate signed URL (valid for 24 hours)
        const { data: signedData } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .createSignedUrl(storagePath, 60 * 60 * 24);

        return {
          storagePath,
          signedUrl: signedData?.signedUrl || `https://storage.supabase.co/${BUCKET_NAME}/${storagePath}`,
          storageProvider: "supabase",
        };
      }
    } catch (supabaseErr) {
      // Fallback gracefully to local disk for local testing / offline demo
    }

    // 2. Local File System Fallback
    await ensureLocalDir();
    const localFilePath = path.join(LOCAL_STORAGE_DIR, path.basename(storagePath));
    await fs.writeFile(localFilePath, fileBuffer);

    // Return data URL or direct static path for offline demo preview
    const base64 = fileBuffer.toString("base64");
    const signedUrl = `data:${contentType};base64,${base64}`;

    return {
      storagePath: `local://${path.basename(storagePath)}`,
      signedUrl,
      storageProvider: "local",
    };
  }

  /**
   * Gets signed URL for existing storage path
   */
  static async getSignedUrl(storagePath: string): Promise<string> {
    if (storagePath.startsWith("local://")) {
      const fileName = storagePath.replace("local://", "");
      try {
        const fileBuffer = await fs.readFile(path.join(LOCAL_STORAGE_DIR, fileName));
        return `data:image/jpeg;base64,${fileBuffer.toString("base64")}`;
      } catch {
        return "";
      }
    }

    try {
      const { data } = await supabaseAdmin.storage
        .from(BUCKET_NAME)
        .createSignedUrl(storagePath, 60 * 60 * 24);
      return data?.signedUrl || "";
    } catch {
      return "";
    }
  }
}
