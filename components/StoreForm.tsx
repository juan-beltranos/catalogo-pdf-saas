import React from 'react';
import { StoreInfo } from '../types';
import { Check, ChevronDown, Image as ImageIcon, Facebook, Instagram, MessageCircle, Trash2 } from 'lucide-react';
import { compressImage } from '../constants';
import { cleanHandle, getWaCountry, getWaNationalNumber, inferWaCountryCode, normalizeWaNumber, WaCountryCode, WA_COUNTRIES } from '@/helper/social';
import { deleteCatalogImage, uploadCatalogImage } from '@/services/r2Storage';

interface StoreFormProps {
  storeInfo: StoreInfo;
  onUpdate: (info: Partial<StoreInfo>) => void;
  canCustomize?: boolean;
  localOnly?: boolean;
}

const countryFlagStyle: Record<WaCountryCode, React.CSSProperties> = {
  "57": { background: "linear-gradient(180deg, #fcd116 0 50%, #003893 50% 75%, #ce1126 75% 100%)" },
  "52": { background: "linear-gradient(90deg, #006341 0 33%, #ffffff 33% 66%, #ce1126 66% 100%)" },
  "591": { background: "linear-gradient(180deg, #d52b1e 0 33%, #f9e300 33% 66%, #007a33 66% 100%)" },
  "593": { background: "linear-gradient(180deg, #fcd116 0 50%, #003893 50% 75%, #ce1126 75% 100%)" },
  "56": { background: "linear-gradient(90deg, #0039a6 0 34%, transparent 34%), linear-gradient(180deg, #ffffff 0 50%, #d52b1e 50% 100%)" },
  "51": { background: "linear-gradient(90deg, #d91023 0 33%, #ffffff 33% 66%, #d91023 66% 100%)" },
  "54": { background: "linear-gradient(180deg, #74acdf 0 33%, #ffffff 33% 66%, #74acdf 66% 100%)" },
};

const CountryFlag: React.FC<{ country: WaCountryCode; className?: string }> = ({ country, className = "" }) => (
  <span
    aria-hidden="true"
    className={`inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[3px] border border-slate-200 shadow-sm ${className}`}
    style={countryFlagStyle[country]}
  />
);

export const StoreForm: React.FC<StoreFormProps> = ({ storeInfo, onUpdate, canCustomize = false, localOnly = false }) => {
  const whatsappCountry = storeInfo.whatsappCountryCode ?? inferWaCountryCode(storeInfo.whatsapp);
  const selectedWhatsappCountry = getWaCountry(whatsappCountry);
  const [countryMenuOpen, setCountryMenuOpen] = React.useState(false);

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
        const asset = localOnly ? { url: base64, key: "" } : await uploadCatalogImage(base64, 'logo');
        const previousKey = storeInfo.logoKey;
        onUpdate({ logo: asset.url, logoKey: asset.key });
        if (previousKey && !localOnly) void deleteCatalogImage(previousKey).catch(console.warn);
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
        const asset = localOnly ? { url: base64, key: "" } : await uploadCatalogImage(base64, 'header');
        const previousKey = storeInfo.headerImageKey;
        onUpdate({ headerImage: asset.url, headerImageKey: asset.key, headerMode: 'image' });
        if (previousKey && !localOnly) void deleteCatalogImage(previousKey).catch(console.warn);
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
      const asset = localOnly ? { url: base64, key: "" } : await uploadCatalogImage(base64, 'cover');
      const previousKey = storeInfo.coverImageKey;
      onUpdate({ coverImage: asset.url, coverImageKey: asset.key });
      if (previousKey && !localOnly) void deleteCatalogImage(previousKey).catch(console.warn);
    } catch (err) {
      console.error("Error compressing cover image", err);
    } finally {
      e.target.value = "";
    }
  };

  return (
      <div className="space-y-5">
        {!canCustomize && <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-700">Color, logo, portada y redes sociales est&aacute;n disponibles desde el plan Pro.</p>}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre del Negocio
          </label>
          <input
            type="text"
            value={storeInfo.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            placeholder="Ej. Mi Tienda Increible"
            className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            WhatsApp de Contacto
          </label>
          <div className="flex gap-2">
            <div className="relative w-40 shrink-0">
              <button
                type="button"
                onClick={() => setCountryMenuOpen((open) => !open)}
                aria-haspopup="listbox"
                aria-expanded={countryMenuOpen}
                aria-label="Pais del numero de WhatsApp"
                className="flex h-full min-h-[42px] w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left outline-none transition hover:border-blue-200 hover:bg-blue-50 focus:ring-2 focus:ring-blue-500"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <CountryFlag country={whatsappCountry} />
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-bold text-slate-700">
                      {selectedWhatsappCountry.name}
                    </span>
                    <span className="block text-xs font-semibold text-slate-500">
                      +{selectedWhatsappCountry.dialCode}
                    </span>
                  </span>
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${countryMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {countryMenuOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-[calc(100%+6px)] z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10"
                >
                  {WA_COUNTRIES.map((country) => {
                    const selected = country.code === whatsappCountry;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onClick={() => {
                          handleWhatsappCountryChange(country.code);
                          setCountryMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                          selected ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <CountryFlag country={country.code} className="h-5 w-7" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{country.name}</span>
                          <span className="block text-xs text-slate-500">+{country.dialCode}</span>
                        </span>
                        {selected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative flex-1">
              <MessageCircle className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-green-500" />
              <input
                type="tel"
                value={getWaNationalNumber(storeInfo.whatsapp, whatsappCountry)}
                onChange={(e) => onUpdate({
                  whatsappCountryCode: whatsappCountry,
                  whatsapp: normalizeWaNumber(e.target.value, whatsappCountry),
                })}
                placeholder={selectedWhatsappCountry.placeholder}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Facebook</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600">
              <Facebook className="w-4 h-4" />
            </span>
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

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Instagram</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-pink-500">
              <Instagram className="w-4 h-4" />
            </span>
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

        <div className="grid grid-cols-2 gap-4">
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
                onClick={() => { const key = storeInfo.coverImageKey; onUpdate({ coverImage: "", coverImageKey: "" }); if (key && !localOnly) void deleteCatalogImage(key).catch(console.warn); }}
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

        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <label htmlFor="showPrices" className="block text-sm font-semibold text-slate-700">
              Mostrar precios en el cat&aacute;logo
            </label>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Se aplica a la vista previa y al PDF exportado.
            </p>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              id="showPrices"
              type="checkbox"
              role="switch"
              checked={storeInfo.showPrices !== false}
              onChange={(e) => onUpdate({ showPrices: e.target.checked })}
              className="peer sr-only"
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:bg-blue-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2" />
            <span className="sr-only">
              {storeInfo.showPrices !== false ? "Ocultar precios" : "Mostrar precios"}
            </span>
          </label>
        </div>

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
  );
};
