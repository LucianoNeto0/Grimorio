export const KEYS = {
  sheet: "rpg.sheet",
  presets: "rpg.presets",
  active: "rpg.active",
  theme: "rpg.theme",
  themes: "rpg.themes",
  onboarding: "rpg.onboarding.v1",
} as const;

export function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function hasStoredValue(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Profile photos stay small enough to coexist with the saved sheet in localStorage. */
export const PROFILE_IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif";
export const MAX_PROFILE_IMAGE_SOURCE_BYTES = 8 * 1024 * 1024;
export const MAX_PROFILE_IMAGE_STORED_BYTES = 250 * 1024;
const PROFILE_IMAGE_MAX_SIDE = 360;
const PROFILE_IMAGE_QUALITIES = [0.82, 0.72, 0.62];

const acceptedProfileImageTypes = new Set(PROFILE_IMAGE_ACCEPT.split(","));

function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (base64.length * 3) / 4 - padding;
}

export function profileImageError(file: Pick<File, "size" | "type">): string | null {
  if (!acceptedProfileImageTypes.has(file.type)) {
    return "Escolha uma imagem JPG, PNG, WebP, AVIF ou HEIC.";
  }
  if (file.size > MAX_PROFILE_IMAGE_SOURCE_BYTES) {
    return "A imagem deve ter no máximo 8 MB.";
  }
  return null;
}

/**
 * Converts a supported profile image into a small JPEG data URL before it is
 * saved with the sheet. Source validation happens before reading the file.
 */
export function prepareProfileImage(file: File): Promise<string> {
  const validationError = profileImageError(file);
  if (validationError) return Promise.reject(new Error(validationError));

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler essa imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Não foi possível abrir essa imagem."));
      img.onload = () => {
        if (!img.width || !img.height) {
          reject(new Error("A imagem não possui dimensões válidas."));
          return;
        }

        const scale = Math.min(1, PROFILE_IMAGE_MAX_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Seu navegador não conseguiu preparar essa imagem."));
          return;
        }

        context.drawImage(img, 0, 0, canvas.width, canvas.height);
        for (const quality of PROFILE_IMAGE_QUALITIES) {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          if (dataUrlBytes(dataUrl) <= MAX_PROFILE_IMAGE_STORED_BYTES) {
            resolve(dataUrl);
            return;
          }
        }
        reject(new Error("A imagem continua grande demais após a compressão."));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Downscales a visual theme image to a JPEG data URL before local storage. */
export function shrinkImage(file: File, max: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Imagem inválida"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
