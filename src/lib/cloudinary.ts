import crypto from 'crypto';

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
}

function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || '').trim();
  const apiKey = (process.env.CLOUDINARY_API_KEY || '').trim();
  const apiSecret = (process.env.CLOUDINARY_API_SECRET || '').trim();
  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(cloudName)) {
    return null;
  }
  const rawFolder = (process.env.CLOUDINARY_FOLDER || 'kon-nee-tiew').trim();
  const folder =
    rawFolder
      .replace(/[^a-zA-Z0-9/_-]/g, '')
      .replace(/^\/+|\/+$/g, '') || 'kon-nee-tiew';

  return { cloudName, apiKey, apiSecret, folder };
}

export function isCloudinaryConfigured(): boolean {
  return getCloudinaryConfig() !== null;
}

function signCloudinaryParams(
  params: Record<string, string>,
  apiSecret: string,
): string {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto
    .createHash('sha1')
    .update(`${serialized}${apiSecret}`)
    .digest('hex');
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  mimeType: string,
  publicIdBase: string,
  ext: string,
): Promise<{ secureUrl: string; bytes: number }> {
  const cfg = getCloudinaryConfig();
  if (!cfg) {
    throw new Error('ยังไม่ได้ตั้งค่า Cloudinary บนเซิร์ฟเวอร์');
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signCloudinaryParams(
    {
      folder: cfg.folder,
      public_id: publicIdBase,
      timestamp,
    },
    cfg.apiSecret,
  );

  const formData = new FormData();
  const blob = new Blob([new Uint8Array(buffer)], { type: mimeType });
  formData.append('file', blob, `${publicIdBase}${ext}`);
  formData.append('api_key', cfg.apiKey);
  formData.append('timestamp', timestamp);
  formData.append('folder', cfg.folder);
  formData.append('public_id', publicIdBase);
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    cfg.cloudName,
  )}/image/upload`;
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  const payload = (await res.json().catch(() => null)) as {
    secure_url?: string;
    bytes?: number;
    error?: { message?: string };
  } | null;

  if (!res.ok || !payload?.secure_url) {
    const reason = payload?.error?.message || `HTTP ${res.status}`;
    throw new Error(`ไม่สามารถอัปโหลดรูปไปยัง Cloudinary ได้ (${reason})`);
  }

  return {
    secureUrl: payload.secure_url,
    bytes: typeof payload.bytes === 'number' ? payload.bytes : buffer.length,
  };
}

export async function deleteFromCloudinaryByFilename(
  filename: string,
): Promise<void> {
  const cfg = getCloudinaryConfig();
  if (!cfg || !filename.startsWith('cld-')) {
    return;
  }

  const publicIdBase = filename.replace(/\.[^.]+$/, '');
  if (!/^[a-zA-Z0-9_-]+$/.test(publicIdBase)) {
    return;
  }

  const fullPublicId = `${cfg.folder}/${publicIdBase}`;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signCloudinaryParams(
    {
      public_id: fullPublicId,
      timestamp,
    },
    cfg.apiSecret,
  );

  const formData = new FormData();
  formData.append('public_id', fullPublicId);
  formData.append('api_key', cfg.apiKey);
  formData.append('timestamp', timestamp);
  formData.append('signature', signature);

  const endpoint = `https://api.cloudinary.com/v1_1/${encodeURIComponent(
    cfg.cloudName,
  )}/image/destroy`;
  try {
    await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });
  } catch (err) {
    console.warn('Cloudinary cleanup failed (non-fatal):', err);
  }
}
