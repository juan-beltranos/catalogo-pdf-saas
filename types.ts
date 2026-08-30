
export interface Product {
  id: string;
  name: string;
  price: number;
  wholesalePrice?: number;
  description: string;
  category?: string;
  image?: string; // base64 o url
  imageId?: string; // apunta a IndexedDB
  imageUnavailable?: boolean; // referencia heredada que no puede reconstruirse
  order?: number;
  featured?: boolean;
  hidden?: boolean;
  quantity?: number;
  originalPrice?: number;
  sku?: string;
}

export type TemplateId = 'minimalist' | 'classic' | 'modern';
export type ImageFit = 'contain' | 'cover' | 'cover-top' | 'square-contain' | 'tall-cover';

export interface StoreInfo {
  name: string;
  whatsapp: string;
  whatsappCountryCode?: '52' | '57';
  facebook?: string;
  instagram?: string;
  additionalInfo?: string;
  color: string;
  logo?: string;
  logoKey?: string;
  templateId: TemplateId;
  showQuantityInPdf?: boolean;
  showWatermarkInPdf?: boolean;
  imageFit?: ImageFit;
  headerMode?: 'color' | 'image';
  headerImage?: string;
  headerImageKey?: string;
  coverImage?: string;
  coverImageKey?: string;
  pdfProductsPerPage?: number;
}

export type ViewMode = 'editor' | 'preview';
export type CatalogAudience = 'retail' | 'wholesale';

export interface CatalogSummary {
  id: string;
  businessId: string;
  name: string;
  description: string;
  status: 'active' | 'archived';
  isPrimary: boolean;
  templateId: TemplateId;
  settings: Record<string, unknown>;
  audience: CatalogAudience;
  productCount: number;
  updatedAt: string;
  readOnly: boolean;
}
