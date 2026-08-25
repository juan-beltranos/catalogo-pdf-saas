
export const STORAGE_KEY = 'instacatalog_data';

export type CatalogCurrency = 'MXN' | 'COP';

export const formatCurrency = (amount: number, currency: CatalogCurrency = 'COP'): string => {
  const locale = currency === 'MXN' ? 'en-US' : 'es-CO';
  const formattedAmount = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: currency === 'MXN' ? 2 : 0,
    maximumFractionDigits: currency === 'MXN' ? 2 : 0,
  }).format(amount);

  return `$${formattedAmount}`;
};

type CompressImageOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
};

export const compressImage = (
  file: File,
  options: CompressImageOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxWidth = options.maxWidth ?? 800;
        const maxHeight = options.maxHeight;
        const scaleSize = Math.min(
          1,
          maxWidth / img.width,
          maxHeight ? maxHeight / img.height : 1
        );

        canvas.width = Math.max(1, Math.round(img.width * scaleSize));
        canvas.height = Math.max(1, Math.round(img.height * scaleSize));

        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Could not get canvas context');
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // Using lower quality to save storage in localStorage
        const dataUrl = canvas.toDataURL('image/jpeg', options.quality ?? 0.7);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};
