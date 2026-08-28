import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { CatalogSummary, Product, StoreInfo } from "../types";
import { STORAGE_KEY } from "../constants";
import { supabase } from "../lib/supabase";
import { deleteCatalogImage, uploadCatalogImage } from "../services/r2Storage";
import { getImageBlob } from "../helper/imageDB";
import { getPlan, PlanLimits } from "../lib/plans";
import { Entitlements, FeatureOverride, getEffectiveEntitlements } from "../lib/entitlements";

const DEFAULT_STORE: StoreInfo = { name: "", whatsapp: "", color: "#3b82f6", templateId: "minimalist", whatsappCountryCode: "57", headerMode: "color", pdfProductsPerPage: 4 };
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const errorMessage = (cause: unknown) => {
  if (cause instanceof Error) return cause.message;
  if (cause && typeof cause === "object" && "message" in cause && typeof (cause as any).message === "string") return (cause as any).message;
  return "No fue posible cargar el catálogo.";
};

const businessToStore = (row: any): StoreInfo => ({
  name: row.name || "", whatsapp: row.whatsapp || "", whatsappCountryCode: row.whatsapp_country_code || "57",
  facebook: row.facebook || "", instagram: row.instagram || "", additionalInfo: row.additional_info || "",
  color: row.color || "#3b82f6", templateId: row.template_id || "minimalist", logo: row.logo_url || "",
  logoKey: row.logo_key || "", headerImage: row.header_image_url || "", headerImageKey: row.header_image_key || "",
  coverImage: row.cover_image_url || "", coverImageKey: row.cover_image_key || "", ...(row.settings || {}),
});

const storeToBusiness = (store: StoreInfo) => ({
  name: store.name, whatsapp: store.whatsapp, whatsapp_country_code: store.whatsappCountryCode || "57",
  facebook: store.facebook || "", instagram: store.instagram || "", additional_info: store.additionalInfo || "",
  color: store.color, template_id: store.templateId, logo_url: store.logo || null, logo_key: store.logoKey || null,
  header_image_url: store.headerImage || null, header_image_key: store.headerImageKey || null,
  cover_image_url: store.coverImage || null, cover_image_key: store.coverImageKey || null,
  settings: { showQuantityInPdf: !!store.showQuantityInPdf, showWatermarkInPdf: !!store.showWatermarkInPdf,
    imageFit: store.imageFit || "contain", headerMode: store.headerMode || "color", pdfProductsPerPage: store.pdfProductsPerPage || 4 },
});

const rowToProduct = (row: any): Product => ({ id: row.id, name: row.name, sku: row.sku || "", price: Number(row.price),
  originalPrice: row.original_price == null ? undefined : Number(row.original_price), description: row.description || "",
  category: row.category || "", image: row.image_url || "", imageId: row.image_key || "", order: row.sort_order,
  featured: row.featured, hidden: row.hidden, quantity: row.quantity == null ? undefined : row.quantity });

const productToRow = (p: Product, businessId: string) => ({ id: p.id, business_id: businessId, name: p.name,
  sku: p.sku || "", price: p.price, original_price: p.originalPrice ?? null, description: p.description || "",
  category: p.category || "", image_url: p.image || null, image_key: p.imageId || null, sort_order: p.order ?? 0,
  featured: !!p.featured, hidden: !!p.hidden, quantity: p.quantity ?? null });

export const useCatalog = (user: User) => {
  const [plan, setPlan] = useState<PlanLimits>(() => getPlan(user.app_metadata?.plan));
  const [entitlements, setEntitlements] = useState<Entitlements>(() => getEffectiveEntitlements(user.app_metadata?.plan));
  const [catalogs, setCatalogs] = useState<CatalogSummary[]>([]);
  const [activeCatalogId, setActiveCatalogId] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(DEFAULT_STORE);
  const [products, setProducts] = useState<Product[]>([]);
  const [libraryProducts, setLibraryProducts] = useState<Product[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveCatalogReadOnly = catalogs.some((catalog) => catalog.id === activeCatalogId && catalog.readOnly);

  useEffect(() => {
    let active = true;
    const loadingTimeout = window.setTimeout(() => {
      if (!active) return;
      setLoading(false);
      setError("Supabase está tardando demasiado en responder. Revisa tu conexión y vuelve a intentarlo.");
    }, 12000);
    const load = async () => {
      if (!supabase) {
        window.clearTimeout(loadingTimeout);
        setLoading(false);
        return;
      }
      setLoading(true); setError(null);
      try {
        let { data: business, error: businessError } = await supabase.from("businesses").select("*").eq("owner_id", user.id).maybeSingle();
        if (businessError) throw businessError;
        if (!business) {
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;
          if (!accessToken) throw new Error("La sesión expiró. Cierra sesión y vuelve a ingresar.");
          const bootstrapResponse = await fetch("/api/catalog/bootstrap", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          const bootstrapResult = await bootstrapResponse.json().catch(() => ({}));
          if (!bootstrapResponse.ok) throw new Error(bootstrapResult.error || "No fue posible inicializar el catálogo.");
          business = bootstrapResult.business;

          const savedInfo = localStorage.getItem(`${STORAGE_KEY}_info`);
          const legacyStore: StoreInfo = savedInfo ? { ...DEFAULT_STORE, ...JSON.parse(savedInfo) } : { ...DEFAULT_STORE };
          for (const [field, keyField, kind] of [["logo", "logoKey", "logo"], ["headerImage", "headerImageKey", "header"], ["coverImage", "coverImageKey", "cover"]] as const) {
            const value = legacyStore[field];
            if (value?.startsWith("data:image")) { const asset = await uploadCatalogImage(value, kind); (legacyStore as any)[field] = asset.url; (legacyStore as any)[keyField] = asset.key; }
          }
          if (savedInfo !== null) {
            const updated = await supabase.from("businesses").update(storeToBusiness(legacyStore)).eq("id", business.id).select("*").single();
            if (updated.error) throw updated.error;
            business = updated.data;
          }
        }
        const [subscriptionResult, overridesResult, catalogsResult] = await Promise.all([
          supabase.from("subscriptions").select("status,current_period_end,grace_period_ends_at").eq("business_id", business.id).maybeSingle(),
          supabase.from("account_feature_overrides").select("feature_key,enabled,limit_value,expires_at").eq("business_id", business.id),
          supabase.from("catalogs").select("*,catalog_products(count)").eq("business_id", business.id).order("updated_at", { ascending: false }),
        ]);
        const subscription = subscriptionResult.data ? {
          status: subscriptionResult.data.status,
          currentPeriodEnd: subscriptionResult.data.current_period_end,
          gracePeriodEndsAt: subscriptionResult.data.grace_period_ends_at,
        } : null;
        const overrides: FeatureOverride[] = (overridesResult.data || []).map((item: any) => ({
          featureKey: item.feature_key,
          enabled: item.enabled,
          limitValue: item.limit_value,
          expiresAt: item.expires_at,
        }));
        const effective = getEffectiveEntitlements(business.lifetime_plan || business.plan, subscription, overrides);
        const loadedCatalogs: CatalogSummary[] = (catalogsResult.data || []).map((catalog: any) => ({
          id: catalog.id, businessId: catalog.business_id, name: catalog.name, description: catalog.description || "",
          status: catalog.status, isPrimary: !!catalog.is_primary, templateId: catalog.template_id,
          settings: catalog.settings || {}, productCount: catalog.catalog_products?.[0]?.count || 0,
          updatedAt: catalog.updated_at, readOnly: !catalog.is_primary && !effective.subscriptionActive,
        }));
        const initialCatalog = loadedCatalogs.find((catalog) => catalog.isPrimary) || loadedCatalogs[0];
        const result = await supabase.from("products").select("*").eq("business_id", business.id).order("sort_order");
        if (result.error) throw result.error;
        let loadedProducts = (result.data || []).map(rowToProduct);
        if (!loadedProducts.length) {
          const saved = localStorage.getItem(`${STORAGE_KEY}_products`);
          const legacy: Product[] = saved ? JSON.parse(saved) : [];
          if (legacy.length) {
            const migrated: Product[] = [];
            for (const old of legacy) {
              const product = { ...old, id: isUuid(old.id) ? old.id : crypto.randomUUID() };
              let dataUrl = product.image?.startsWith("data:image") ? product.image : "";
              if (!dataUrl && product.imageId) {
                const blob = await getImageBlob(product.imageId).catch(() => null);
                if (blob) dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
                else { product.imageId = ""; product.imageUnavailable = true; }
              }
              if (dataUrl) { const asset = await uploadCatalogImage(dataUrl, "product"); product.image = asset.url; product.imageId = asset.key; }
              migrated.push(product);
            }
            const inserted = await supabase.from("products").upsert(migrated.map((p) => productToRow(p, business.id)));
            if (inserted.error) throw inserted.error;
            loadedProducts = migrated;
          }
        }
        if (active) {
          const permanentPlan = getPlan(business.lifetime_plan || business.plan);
          setBusinessId(business.id); setPlan({ ...permanentPlan, name: effective.subscriptionActive ? "Suscripción" : permanentPlan.name, products: effective.maxProducts, categories: effective.maxCategories,
            images: effective.maxImages, customization: effective.canCustomizeBrand, excel: effective.canImportExcel && effective.canExportExcel,
            premiumProductTools: effective.canUsePremiumProductTools, advancedLayouts: effective.canUseAdvancedLayouts }); setEntitlements(effective);
          setCatalogs(loadedCatalogs); setActiveCatalogId(initialCatalog?.id || null);
          setStoreInfo(businessToStore(business)); setProducts(loadedProducts); setLibraryProducts(loadedProducts);
          localStorage.setItem(`${STORAGE_KEY}_migrated`, user.id);
        }
      } catch (cause) { if (active) setError(errorMessage(cause)); }
      finally {
        window.clearTimeout(loadingTimeout);
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; window.clearTimeout(loadingTimeout); if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [user.id]);

  const openCatalog = useCallback(async (catalogId: string) => {
    if (!supabase) return false;
    const catalog = catalogs.find((item) => item.id === catalogId);
    if (!catalog) return false;
    const { data, error: loadError } = await supabase.from("catalog_products")
      .select("sort_order,price_override,description_override,hidden_override,products(*)")
      .eq("catalog_id", catalogId).eq("included", true).order("sort_order");
    if (loadError) { setError(loadError.message); return false; }
    const selected = (data || []).map((item: any) => {
      const product = rowToProduct(Array.isArray(item.products) ? item.products[0] : item.products);
      return { ...product, order: item.sort_order, price: item.price_override == null ? product.price : Number(item.price_override),
        description: item.description_override ?? product.description, hidden: item.hidden_override ?? product.hidden };
    });
    setProducts(selected); setActiveCatalogId(catalogId); setError(null); return true;
  }, [catalogs]);

  const createCatalog = useCallback(async (name: string) => {
    if (!supabase || !entitlements.canCreateMultipleCatalogs) { setError("Esta función requiere una suscripción activa."); return false; }
    const { data, error: createError } = await supabase.rpc("create_catalog", { catalog_name: name.trim() });
    if (createError) { setError(createError.message); return false; }
    const row = Array.isArray(data) ? data[0] : data;
    const catalog: CatalogSummary = { id: row.id, businessId: row.business_id, name: row.name, description: row.description || "", status: row.status,
      isPrimary: false, templateId: row.template_id, settings: row.settings || {}, productCount: 0, updatedAt: row.updated_at, readOnly: false };
    setCatalogs((current) => [catalog, ...current]); setProducts([]); setActiveCatalogId(catalog.id); setError(null); return true;
  }, [entitlements.canCreateMultipleCatalogs]);

  const duplicateCatalog = useCallback(async (catalog: CatalogSummary) => {
    if (!supabase || !entitlements.canDuplicateCatalogs) { setError("Esta función requiere una suscripción activa."); return false; }
    const { data, error: duplicateError } = await supabase.rpc("duplicate_catalog", { source_catalog: catalog.id, catalog_name: `${catalog.name} - copia` });
    if (duplicateError) { setError(duplicateError.message); return false; }
    const row = Array.isArray(data) ? data[0] : data;
    setCatalogs((current) => [{ id: row.id, businessId: row.business_id, name: row.name, description: row.description || "", status: row.status,
      isPrimary: false, templateId: row.template_id, settings: row.settings || {}, productCount: catalog.productCount, updatedAt: row.updated_at, readOnly: false }, ...current]);
    setError(null); return true;
  }, [entitlements.canDuplicateCatalogs]);

  const archiveCatalog = useCallback(async (catalog: CatalogSummary) => {
    if (!supabase || catalog.isPrimary || catalog.readOnly) return false;
    const status = catalog.status === "archived" ? "active" : "archived";
    const { error: archiveError } = await supabase.from("catalogs").update({ status }).eq("id", catalog.id);
    if (archiveError) { setError(archiveError.message); return false; }
    setCatalogs((current) => current.map((item) => item.id === catalog.id ? { ...item, status } : item)); return true;
  }, []);

  const renameCatalog = useCallback(async (catalog: CatalogSummary, name: string) => {
    if (!supabase || catalog.readOnly || !name.trim()) return false;
    const { error: renameError } = await supabase.from("catalogs").update({ name: name.trim() }).eq("id", catalog.id);
    if (renameError) { setError(renameError.message); return false; }
    setCatalogs((current) => current.map((item) => item.id === catalog.id ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() } : item));
    setError(null); return true;
  }, []);

  const deleteCatalog = useCallback(async (catalog: CatalogSummary) => {
    if (!supabase || catalog.isPrimary || catalog.readOnly) return false;
    const { error: deleteError } = await supabase.from("catalogs").delete().eq("id", catalog.id);
    if (deleteError) { setError(deleteError.message); return false; }
    const primary = catalogs.find((item) => item.isPrimary);
    setCatalogs((current) => current.filter((item) => item.id !== catalog.id));
    if (activeCatalogId === catalog.id && primary) await openCatalog(primary.id);
    setError(null); return true;
  }, [activeCatalogId, catalogs, openCatalog]);

  const addLibraryProductsToCatalog = useCallback(async (productIds: string[]) => {
    if (!supabase || !activeCatalogId || isActiveCatalogReadOnly || !entitlements.canUseProductLibrary) return false;
    const catalog = catalogs.find((item) => item.id === activeCatalogId);
    if (!catalog || catalog.isPrimary) return false;
    const existing = new Set(products.map((product) => product.id));
    const selected = libraryProducts.filter((product) => productIds.includes(product.id) && !existing.has(product.id));
    if (!selected.length) return true;
    const { error: linkError } = await supabase.from("catalog_products").upsert(selected.map((product, index) => ({
      catalog_id: catalog.id, product_id: product.id, sort_order: products.length + index, included: true,
    })));
    if (linkError) { setError(linkError.message); return false; }
    setProducts((current) => [...current, ...selected]);
    setCatalogs((current) => current.map((item) => item.id === catalog.id ? { ...item, productCount: item.productCount + selected.length } : item));
    setError(null); return true;
  }, [activeCatalogId, catalogs, entitlements.canUseProductLibrary, isActiveCatalogReadOnly, libraryProducts, products]);

  const updateStoreInfo = useCallback((info: Partial<StoreInfo>) => {
    if (isActiveCatalogReadOnly) { setError("Este catálogo está disponible en modo lectura."); return; }
    if (!plan.customization && Object.keys(info).some((key) => ["color", "logo", "logoKey", "headerMode", "headerImage", "headerImageKey", "coverImage", "coverImageKey", "facebook", "instagram"].includes(key))) {
      setError("Esta personalización está disponible desde el plan Pro."); return;
    }
    if (!plan.advancedLayouts && info.pdfProductsPerPage !== undefined && info.pdfProductsPerPage !== 4) {
      setError("Los layouts avanzados están disponibles en Premium."); return;
    }
    setStoreInfo((previous) => {
      const next = { ...previous, ...info };
      if (businessId && supabase) { if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(async () => {
        const { error: saveError } = await supabase!.from("businesses").update(storeToBusiness(next)).eq("id", businessId);
        setError(saveError?.message || null);
      }, 500); }
      return next;
    });
  }, [businessId, isActiveCatalogReadOnly, plan.advancedLayouts, plan.customization]);

  const addProduct = useCallback(async (input: Product): Promise<boolean> => {
    if (!businessId || !supabase) return false;
    if (isActiveCatalogReadOnly) { setError("Este catálogo está disponible en modo lectura."); return false; }
    if (plan.products !== null && products.length >= plan.products) { setError(`El plan ${plan.name} admite hasta ${plan.products} productos.`); return false; }
    const categories = new Set(products.map((p) => p.category?.trim().toLowerCase()).filter(Boolean));
    const nextCategory = input.category?.trim().toLowerCase();
    if (nextCategory && !categories.has(nextCategory) && plan.categories !== null && categories.size >= plan.categories) { setError(`El plan ${plan.name} admite hasta ${plan.categories} categorías.`); return false; }
    if (input.image && plan.images !== null && products.filter((p) => !!p.image).length >= plan.images) { setError(`El plan ${plan.name} admite hasta ${plan.images} productos con imagen.`); return false; }
    const product = { ...input, id: isUuid(input.id) ? input.id : crypto.randomUUID() };
    setProducts((previous) => [product, ...previous]);
    setLibraryProducts((previous) => [product, ...previous]);
    const row = productToRow(product, businessId);
    let saveError: { message: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        // The fixed UUID makes this retry safe if the first response was lost
        // after Supabase had already committed the product.
        const result = await supabase.from("products").upsert(row, { onConflict: "id" }).select("id").single();
        saveError = result.error;
      } catch (cause) {
        saveError = { message: errorMessage(cause) };
      }
      if (!saveError || !/failed to fetch|network|fetch failed|load failed/i.test(saveError.message) || attempt === 1) break;
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
    if (saveError && /failed to fetch|network|fetch failed|load failed/i.test(saveError.message)) {
      saveError = { message: "No se pudo conectar con Supabase. Revisa tu conexión e inténtalo nuevamente." };
    }
    if (saveError) { setProducts((current) => current.filter((p) => p.id !== product.id)); setLibraryProducts((current) => current.filter((p) => p.id !== product.id)); setError(saveError.message); return false; }
    const activeCatalog = catalogs.find((catalog) => catalog.id === activeCatalogId);
    if (activeCatalog && !activeCatalog.isPrimary) {
      const { error: linkError } = await supabase.from("catalog_products").upsert({ catalog_id: activeCatalog.id, product_id: product.id, sort_order: product.order ?? 0 });
      if (linkError) { setError(linkError.message); return false; }
    }
    setError(null);
    return true;
  }, [activeCatalogId, businessId, catalogs, isActiveCatalogReadOnly, plan, products]);

  const updateProduct = useCallback(async (id: string, updates: Partial<Product>): Promise<boolean> => {
    if (!businessId || !supabase) return false;
    if (isActiveCatalogReadOnly) { setError("Este catálogo está disponible en modo lectura."); return false; }
    const current = products.find((p) => p.id === id);
    if (!current) return false;
    const next = { ...current, ...updates };
    const categories = new Set(products.filter((p) => p.id !== id).map((p) => p.category?.trim().toLowerCase()).filter(Boolean));
    const nextCategory = next.category?.trim().toLowerCase();
    if (nextCategory && !categories.has(nextCategory) && plan.categories !== null && categories.size >= plan.categories) { setError(`El plan ${plan.name} admite hasta ${plan.categories} categorías.`); return false; }
    if (next.image && plan.images !== null && products.filter((p) => p.id !== id && !!p.image).length >= plan.images) { setError(`El plan ${plan.name} admite hasta ${plan.images} productos con imagen.`); return false; }
    setProducts((previous) => previous.map((p) => p.id === id ? next : p));
    const activeCatalog = catalogs.find((catalog) => catalog.id === activeCatalogId);
    const saveResult = activeCatalog && !activeCatalog.isPrimary
      ? await supabase.from("catalog_products").update({ price_override: next.price, description_override: next.description, hidden_override: !!next.hidden, sort_order: next.order ?? 0 })
          .eq("catalog_id", activeCatalog.id).eq("product_id", id).select("product_id").single()
      : await supabase.from("products").update(productToRow(next, businessId)).eq("id", id).select("id").single();
    const saveError = saveResult.error;
    if (saveError) { setProducts((previous) => previous.map((p) => p.id === id ? current : p)); setError(saveError.message); return false; }
    if (!activeCatalog || activeCatalog.isPrimary) setLibraryProducts((previous) => previous.map((product) => product.id === id ? next : product));
    setError(null);
    return true;
  }, [activeCatalogId, businessId, catalogs, isActiveCatalogReadOnly, plan, products]);

  const removeProduct = useCallback(async (id: string): Promise<boolean> => {
    if (!supabase) return false;
    if (isActiveCatalogReadOnly) { setError("Este catálogo está disponible en modo lectura."); return false; }
    const removed = products.find((p) => p.id === id);
    if (!removed) return false;
    setProducts((previous) => previous.filter((p) => p.id !== id));
    const activeCatalog = catalogs.find((catalog) => catalog.id === activeCatalogId);
    const removesFromLibrary = !activeCatalog || activeCatalog.isPrimary;
    const result = removesFromLibrary
      ? await supabase.from("products").delete().eq("id", id).select("id").single()
      : await supabase.from("catalog_products").delete().eq("catalog_id", activeCatalog.id).eq("product_id", id).select("product_id").single();
    const saveError = result.error;
    if (saveError) { setProducts((p) => [...p, removed]); setError(saveError.message); return false; }
    if (removesFromLibrary) setLibraryProducts((current) => current.filter((product) => product.id !== id));
    if (removesFromLibrary && removed.imageId) {
      try {
        await deleteCatalogImage(removed.imageId);
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : "Error desconocido";
        setError(`El producto se eliminó, pero no se pudo borrar su imagen de R2: ${message}`);
        return false;
      }
    }
    setError(null);
    return true;
  }, [activeCatalogId, catalogs, isActiveCatalogReadOnly, products]);

  const clearAll = useCallback(() => {
    if (!businessId || !supabase || !confirm("¿Estás seguro de que quieres borrar todos los productos y los datos del negocio?")) return;
    const oldProducts = products; const oldStore = storeInfo; setProducts([]); setStoreInfo(DEFAULT_STORE);
    void Promise.all([supabase.from("products").delete().eq("business_id", businessId), supabase.from("businesses").update(storeToBusiness(DEFAULT_STORE)).eq("id", businessId)])
      .then(async ([a, b]) => { const failure = a.error || b.error; if (failure) { setProducts(oldProducts); setStoreInfo(oldStore); setError(failure.message); return; }
        await Promise.allSettled([...oldProducts.map((p) => deleteCatalogImage(p.imageId)), deleteCatalogImage(oldStore.logoKey), deleteCatalogImage(oldStore.headerImageKey), deleteCatalogImage(oldStore.coverImageKey)]); });
  }, [businessId, products, storeInfo]);

  const activeCatalog = catalogs.find((catalog) => catalog.id === activeCatalogId) || null;
  return { storeInfo, products, libraryProducts, plan, entitlements, catalogs, activeCatalog, activeCatalogId, openCatalog, createCatalog, duplicateCatalog, archiveCatalog, renameCatalog, deleteCatalog, addLibraryProductsToCatalog,
    updateStoreInfo, addProduct, updateProduct, removeProduct, clearAll, loading, error };
};
