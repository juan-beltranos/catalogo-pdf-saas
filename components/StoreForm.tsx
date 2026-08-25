import React from 'react';
import { StoreInfo } from '../types';
import { Store, Image as ImageIcon, Facebook, Instagram, MessageCircle, Trash2 } from 'lucide-react';
import { compressImage } from '../constants';
import { cleanHandle, getWaNationalNumber, inferWaCountryCode, normalizeWaNumber, WaCountryCode } from '@/helper/social';
import { deleteCatalogImage, uploadCatalogImage } from '@/services/r2Storage';
import { SidebarAccordion } from './SidebarAccordion';

interface StoreFormProps {
  storeInfo: StoreInfo;
  onUpdate: (info: Partial<StoreInfo>) => void;
  canCustomize?: boolean;
}

export const StoreForm: React.FC<StoreFormProps> = ({ storeInfo, onUpdate, canCustomize = false }) => {
  const whatsappCountry = storeInfo.whatsappCountryCode ?? inferWaCountryCode(storeInfo.whatsapp);

  const handleWhatsappCountryChange = (country: WaCountryCode) => {
    const nationalNumber = getWaNationalNumber(storeInfo.whatsapp, whatsappCountry);
    onUpdate({
      whatsappCountryCode: country,
      whatsapp: normalizeWaNumber(nationalNumber, country),
    });
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCustomize) return;
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        const asset = await uploadCatalogImage(base64, 'logo');
        const previousKey = storeInfo.logoKey;
        onUpdate({ logo: asset.url, logoKey: asset.key });
        if (previousKey) void deleteCatalogImage(previousKey).catch(console.warn);
      } catch (err) {
        console.error("Error compressing logo", err);
      }
    }
  };

  const handleHeaderImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCustomize) return;
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await compressImage(file);
        const asset = await uploadCatalogImage(base64, 'header');
        const previousKey = storeInfo.headerImageKey;
        onUpdate({ headerImage: asset.url, headerImageKey: asset.key, headerMode: 'image' });
        if (previousKey) void deleteCatalogImage(previousKey).catch(console.warn);
      } catch (err) {
        console.error("Error compressing header image", err);
      }
    }
  };

  const handleCoverImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canCustomize) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const base64 = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 2264,
        quality: 0.82,
      });
      const asset = await uploadCatalogImage(base64, 'cover');
      const previousKey = storeInfo.coverImageKey;
      onUpdate({ coverImage: asset.url, coverImageKey: asset.key });
      if (previousKey) void deleteCatalogImage(previousKey).catch(console.warn);
    } catch (err) {
      console.error("Error compressing cover image", err);
    } finally {
      e.target.value = "";
    }
  };

  return (
    <SidebarAccordion
      title="Datos de tu tienda"
      summary={storeInfo.name?.trim() || 'Completa la información de tu negocio'}
      icon={Store}
    >
      <div className="space-y-4">
        {!canCustomize && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">Color, logo, portada y redes sociales están disponibles desde el plan Pro.</p>}

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre del Negocio
          </label>
          <input
            type="text"
            value={storeInfo.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Ej. Mi Tienda Increíble"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            WhatsApp de Contacto
          </label>
          <div className="flex gap-2">
            <select
              value={whatsappCountry}
              onChange={(e) => handleWhatsappCountryChange(e.target.value as WaCountryCode)}
              aria-label="País del número de WhatsApp"
              className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="57">🇨🇴 +57</option>
              <option value="52">🇲🇽 +52</option>
            </select>
            <div className="relative flex-1">
              <MessageCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
              <input
                type="tel"
                value={getWaNationalNumber(storeInfo.whatsapp, whatsappCountry)}
                onChange={(e) => onUpdate({
                  whatsappCountryCode: whatsappCountry,
                  whatsapp: normalizeWaNumber(e.target.value, whatsappCountry),
                })}
                placeholder={whatsappCountry === "57" ? "3001234567" : "5512345678"}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Facebook */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
              <Facebook className="w-4 h-4" />
            </span>

            {/* prefijo */}
            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              facebook.com/
            </span>

            <input
              type="text"
              value={storeInfo.facebook || ""}
              disabled={!canCustomize}
              onChange={(e) => onUpdate({ facebook: cleanHandle(e.target.value) })}
              placeholder="tuusuario"
              className="w-full pl-[150px] pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500">
              <Instagram className="w-4 h-4" />
            </span>

            {/* prefijo */}
            <span className="absolute left-10 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              instagram.com/
            </span>

            <input
              type="text"
              value={storeInfo.instagram || ""}
              disabled={!canCustomize}
              onChange={(e) => onUpdate({ instagram: cleanHandle(e.target.value) })}
              placeholder="tuusuario"
              className="w-full pl-[160px] pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Color y Logo */}
        <div className="grid grid-cols-2 gap-4">
          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Fondo del Banner
            </label>

            <div className="flex gap-2 mb-3">
              <button
                type="button"
                disabled={!canCustomize}
                onClick={() => onUpdate({ headerMode: 'color' })}
                className={`px-3 py-2 rounded-lg text-sm border ${(storeInfo.headerMode ?? 'color') === 'color'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200'
                  }`}
              >
                Color
              </button>

              <button
                type="button"
                disabled={!canCustomize}
                onClick={() => onUpdate({ headerMode: 'image' })}
                className={`px-3 py-2 rounded-lg text-sm border ${storeInfo.headerMode === 'image'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 border-slate-200'
                  }`}
              >
                Imagen
              </button>
            </div>

            {(storeInfo.headerMode ?? 'color') === 'color' ? (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  disabled={!canCustomize}
                  value={storeInfo.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-10 h-10 rounded-lg cursor-pointer border-none"
                />
                <span className="text-xs text-slate-500 font-mono uppercase">
                  {storeInfo.color}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-2 rounded-lg flex items-center gap-2 text-sm text-slate-600">
                  <ImageIcon className="w-4 h-4" />
                  Subir banner
                  <input
                    type="file"
                    disabled={!canCustomize}
                    accept="image/*"
                    className="hidden"
                    onChange={handleHeaderImageChange}
                  />
                </label>

                {storeInfo.headerImage && (
                  <img
                    src={storeInfo.headerImage}
                    alt="Banner preview"
                    className="w-16 h-10 object-cover rounded-lg border border-slate-200"
                  />
                )}
              </div>
            )}
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
             Tu Logo
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 p-2 rounded-lg flex items-center gap-2 text-sm text-slate-600">
                <ImageIcon className="w-4 h-4" />
                Subir
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} disabled={!canCustomize} />
              </label>
              {storeInfo.logo && (
                <img
                  src={storeInfo.logo}
                  alt="Logo preview"
                  className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                />
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Informaci&oacute;n adicional
          </label>
          <textarea
            value={storeInfo.additionalInfo || ""}
            onChange={(e) => onUpdate({ additionalInfo: e.target.value })}
            placeholder="Ej. Horarios, direcci&oacute;n, m&eacute;todos de pago, cobertura de entregas..."
            rows={4}
            className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed outline-none transition focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Portada personalizada
              </label>
              <p className="mt-1 text-xs leading-relaxed text-slate-500">
                Recomendado: imagen vertical A4, 1600 x 2264 px o proporci&oacute;n 1:1.414.
              </p>
            </div>

            {storeInfo.coverImage && (
              <button
                type="button"
                onClick={() => { const key = storeInfo.coverImageKey; onUpdate({ coverImage: "", coverImageKey: "" }); if (key) void deleteCatalogImage(key).catch(console.warn); }}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-white hover:text-red-500"
                title="Quitar portada"
                aria-label="Quitar portada"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 transition hover:bg-slate-100">
              <ImageIcon className="h-4 w-4" />
              Subir portada
              <input
                type="file"
                disabled={!canCustomize}
                accept="image/*"
                className="hidden"
                onChange={handleCoverImageChange}
              />
            </label>

            {storeInfo.coverImage ? (
              <img
                src={storeInfo.coverImage}
                alt="Portada preview"
                className="h-20 w-14 rounded-lg border border-slate-200 bg-white object-cover"
              />
            ) : (
              <span className="text-xs text-slate-400">
                Si no subes una portada, el PDF se genera como siempre.
              </span>
            )}
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <input
            id="showQuantityInPdf"
            type="checkbox"
            checked={!!storeInfo.showQuantityInPdf}
            onChange={(e) => onUpdate({ showQuantityInPdf: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="showQuantityInPdf" className="text-sm text-slate-700 font-medium">
            Mostrar cantidad Stock en el PDF
          </label>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <input
            id="showWatermarkInPdf"
            type="checkbox"
            checked={!!storeInfo.showWatermarkInPdf}
            onChange={(e) => onUpdate({ showWatermarkInPdf: e.target.checked })}
            className="w-4 h-4 text-blue-600"
          />
          <label htmlFor="showWatermarkInPdf" className="text-sm text-slate-700 font-medium">
            Mostrar marca de agua con mi logo en el PDF
          </label>
        </div>

      </div>
    </SidebarAccordion>
  );
};
