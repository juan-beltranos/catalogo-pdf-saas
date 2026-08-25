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

export type WaCountryCode = "52" | "57";

export function inferWaCountryCode(input: string): WaCountryCode {
    const digits = (input || "").replace(/[^\d]/g, "").replace(/^00/, "");
    return digits.startsWith("52") ? "52" : "57";
}

export function getWaNationalNumber(input: string, country: WaCountryCode) {
    const digits = (input || "").replace(/[^\d]/g, "").replace(/^00/, "");
    const national = digits.startsWith(country) && digits.length > 10
        ? digits.slice(country.length)
        : digits;
    // Mexico dejo de usar el "1" entre +52 y el numero movil.
    return country === "52" && national.length === 11 && national.startsWith("1")
        ? national.slice(1)
        : national;
}

export function normalizeWaNumber(input: string, defaultCountry: WaCountryCode = "57") {
    if (!input) return "";

    // deja solo dígitos (quita +, espacios, guiones, paréntesis)
    let digits = input.replace(/[^\d]/g, "");

    // soporta números con prefijo 00 (ej: 0057...)
    if (digits.startsWith("00")) digits = digits.slice(2);

    // Repara tanto 521XXXXXXXXXX como un numero nacional 1XXXXXXXXXX.
    if (defaultCountry === "52") {
        if (digits.length === 13 && digits.startsWith("521")) {
            digits = `52${digits.slice(3)}`;
        } else if (digits.length === 11 && digits.startsWith("1")) {
            digits = digits.slice(1);
        }
    }

    // si ya viene con el país (57...), lo dejamos
    if (digits.startsWith(defaultCountry)) return digits;

    // si parece celular colombiano (10 dígitos y empieza por 3), agrega 57
    if (defaultCountry === "57" && digits.length === 10 && digits.startsWith("3")) {
        return defaultCountry + digits;
    }

    if (defaultCountry === "52" && digits.length === 10) {
        return defaultCountry + digits;
    }

    // si no puedes inferir, devuélvelo como está (o valida y muestra error)
    return digits;
}

export function formatWaNumber(
    input: string,
    defaultCountry: WaCountryCode = "57",
) {
    const normalized = normalizeWaNumber(input, defaultCountry);
    if (!normalized) return "";

    const country = normalized.startsWith(defaultCountry)
        ? defaultCountry
        : inferWaCountryCode(normalized);
    const national = normalized.startsWith(country)
        ? normalized.slice(country.length)
        : normalized;

    // Mexico y Colombia usan números nacionales de 10 dígitos. La agrupación
    // 3-3-4 facilita leerlos sin alterar el valor usado por los enlaces.
    if (national.length === 10) {
        return `+${country} ${national.slice(0, 3)}-${national.slice(3, 6)}-${national.slice(6)}`;
    }

    return `+${normalized}`;
}
