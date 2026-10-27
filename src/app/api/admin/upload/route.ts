import { NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { getAdminClaims } from "@/lib/auth";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/jpg", // some Windows/phone/WhatsApp sources report .jpg as "image/jpg"
]);

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Fall back to sniffing actual file bytes when the declared MIME type is
// missing/empty or unusual (common with phone/WhatsApp/image-email downloads).
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  if (buf.length >= 12 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && buf.toString("latin1", 4, 8) === "ftyp") {
    const brand = buf.toString("latin1", 8, 10);
    if (brand === "av" || buf.toString("latin1", 8, 12) === "avis") return "image/avif";
  }
  const head = buf.length >= 6 ? buf.toString("latin1", 0, 6) : "";
  if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  return null;
}

export async function POST(request: Request) {
  const claims = await getAdminClaims();
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, WebP, GIF or AVIF images are allowed." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(        { error: "Image must be under 10 MB." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name).toLowerCase().replace(/[^a-z0-9.]/g, "") || ".jpg";
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "images", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, safeName), bytes);

    const url = `/images/uploads/${safeName}`;
    return NextResponse.json({ ok: true, url });
  } catch {
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
