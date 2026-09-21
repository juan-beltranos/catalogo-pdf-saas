export const cleanHandle = (v: string) => {
    const s = (v || "").trim();
    if (!s) return "";
    // quita @, espacios, y URLs pegadas
    return s
        .replace(/^@+/, "")
        .replace(/^https?:\/\/(www\.)?/i, "")
        .replace(/^facebook\.com\//i, "")
        .replace(/^instagram\.com\//i, "")
        .replace(/^fb\.com\//i, "")
        .replace(/\/+$/, "")
        .trim();
};

export const facebookUrl = (handle: string) => {
    const h = cleanHandle(handle);
    return h ? `https://facebook.com/${h}` : "";
};

export const instagramUrl = (handle: string) => {
    const h = cleanHandle(handle);
    return h ? `https://instagram.com/${h}` : "";
};

export const facebookLabel = (handle: string) => {
    const h = cleanHandle(handle);
    return h ? `facebook.com/${h}` : "";
};

export const instagramLabel = (handle: string) => {
    const h = cleanHandle(handle);
    return h ? `instagram.com/${h}` : "";
};

export const WA_COUNTRIES = [
    { code: "57", dialCode: "57", flag: "🇨🇴", name: "Colombia", label: "CO +57", placeholder: "3001234567", currency: "COP", locale: "es-CO", decimals: 0 },
    { code: "52", dialCode: "52", flag: "🇲🇽", name: "Mexico", label: "MX +52", placeholder: "5512345678", currency: "MXN", locale: "es-MX", decimals: 2 },
    { code: "591", dialCode: "591", flag: "🇧🇴", name: "Bolivia", label: "BO +591", placeholder: "71234567", currency: "BOB", locale: "es-BO", decimals: 2 },
    { code: "593", dialCode: "593", flag: "🇪🇨", name: "Ecuador", label: "EC +593", placeholder: "991234567", currency: "USD", locale: "es-EC", decimals: 2 },
    { code: "56", dialCode: "56", flag: "🇨🇱", name: "Chile", label: "CL +56", placeholder: "912345678", currency: "CLP", locale: "es-CL", decimals: 0 },
    { code: "51", dialCode: "51", flag: "🇵🇪", name: "Peru", label: "PE +51", placeholder: "912345678", currency: "PEN", locale: "es-PE", decimals: 2 },
    { code: "54", dialCode: "54", flag: "🇦🇷", name: "Argentina", label: "AR +54", placeholder: "91123456789", currency: "ARS", locale: "es-AR", decimals: 2 },
] as const;

export type WaCountryCode = (typeof WA_COUNTRIES)[number]["code"];
export type CatalogCurrency = (typeof WA_COUNTRIES)[number]["currency"];

export const DEFAULT_WA_COUNTRY: WaCountryCode = "57";

export function getWaCountry(country: WaCountryCode = DEFAULT_WA_COUNTRY) {
    return WA_COUNTRIES.find((item) => item.code === country) ?? WA_COUNTRIES.find((item) => item.code === DEFAULT_WA_COUNTRY)!;
}

export function isWaCountryCode(value: string | null | undefined): value is WaCountryCode {
    return WA_COUNTRIES.some((item) => item.code === value);
}

export function getCurrencyForWaCountry(country: WaCountryCode = DEFAULT_WA_COUNTRY): CatalogCurrency {
    return getWaCountry(country).currency;
}

export function getCurrencyFormat(currency: CatalogCurrency) {
    const country = WA_COUNTRIES.find((item) => item.currency === currency);
    return {
        locale: country?.locale ?? "es-CO",
        decimals: country?.decimals ?? 2,
    };
}

export function inferWaCountryCode(input: string): WaCountryCode {
    const digits = (input || "").replace(/[^\d]/g, "").replace(/^00/, "");

    const match = [...WA_COUNTRIES]
        .sort((a, b) => b.dialCode.length - a.dialCode.length)
        .find((country) => digits.startsWith(country.dialCode));

    return match?.code ?? DEFAULT_WA_COUNTRY;
}

export function getWaNationalNumber(input: string, country: WaCountryCode) {
    const digits = (input || "").replace(/[^\d]/g, "").replace(/^00/, "");
    const dialCode = getWaCountry(country).dialCode;
    const national = digits.startsWith(dialCode) && digits.length > dialCode.length + 5
        ? digits.slice(dialCode.length)
        : digits;
    // Mexico dejo de usar el "1" entre +52 y el numero movil.
    return country === "52" && national.length === 11 && national.startsWith("1")
        ? national.slice(1)
        : national;
}

export function normalizeWaNumber(input: string, defaultCountry: WaCountryCode = DEFAULT_WA_COUNTRY) {
    if (!input) return "";
    const country = getWaCountry(defaultCountry);
    const raw = input.trim();
    let hasInternationalPrefix = raw.startsWith("+") || raw.startsWith("00");
    let digits = input.replace(/[^\d]/g, "");

    if (digits.startsWith("00")) {
        digits = digits.slice(2);
        hasInternationalPrefix = true;
    }

    if (defaultCountry === "52") {
        if (digits.length === 13 && digits.startsWith("521")) {
            digits = `52${digits.slice(3)}`;
        } else if (digits.length === 11 && digits.startsWith("1")) {
            digits = digits.slice(1);
        }
    }

    if (digits.startsWith(country.dialCode)) return digits;

    if (hasInternationalPrefix && WA_COUNTRIES.some((item) => digits.startsWith(item.dialCode) && digits.length > item.dialCode.length + 5)) {
        return digits;
    }

    if (digits.length >= 6) return country.dialCode + digits;

    return digits;
}

export function formatWaNumber(
    input: string,
    defaultCountry: WaCountryCode = DEFAULT_WA_COUNTRY,
) {
    const normalized = normalizeWaNumber(input, defaultCountry);
    if (!normalized) return "";

    const country = normalized.startsWith(getWaCountry(defaultCountry).dialCode)
        ? defaultCountry
        : inferWaCountryCode(normalized);
    const dialCode = getWaCountry(country).dialCode;
    const national = normalized.startsWith(dialCode)
        ? normalized.slice(dialCode.length)
        : normalized;

    if (national.length === 10) {
        return `+${dialCode} ${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
    }

    return `+${dialCode} ${national.replace(/(\d{3})(?=\d)/g, "$1 ").trim()}`;
}
