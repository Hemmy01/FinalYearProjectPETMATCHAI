// Nigeria-specific constants and validation helpers (locations + phone numbers).

// Major cities / towns across all 36 states + FCT. Displayed as "City, Nigeria".
export const NIGERIA_CITIES: string[] = [
  "Aba", "Abakaliki", "Abeokuta", "Abuja", "Ado-Ekiti", "Afikpo", "Agbor", "Ajah",
  "Akure", "Argungu", "Asaba", "Auchi", "Awka", "Azare", "Badagry", "Bauchi",
  "Benin City", "Bida", "Birnin Kebbi", "Bonny", "Bukuru", "Calabar", "Damaturu",
  "Daura", "Dutse", "Ede", "Effurun", "Eket", "Ekpoma", "Enugu", "Epe", "Funtua",
  "Gboko", "Gombe", "Gusau", "Gwagwalada", "Hadejia", "Ibadan", "Ibafo", "Ijebu-Ode",
  "Ikare", "Ikeja", "Ikere-Ekiti", "Ikirun", "Ikorodu", "Ikot Ekpene", "Ilaro",
  "Ile-Ife", "Ilesa", "Ilorin", "Iseyin", "Iwo", "Jalingo", "Jimeta", "Jos", "Kaduna",
  "Kafanchan", "Kano", "Karu", "Katsina", "Keffi", "Kontagora", "Kubwa", "Lafia",
  "Lagos", "Lekki", "Lokoja", "Maiduguri", "Makurdi", "Minna", "Modakeke", "Mowe",
  "Mubi", "Nnewi", "Nsukka", "Numan", "Nyanya", "Offa", "Ogbomoso", "Ogoja", "Okene",
  "Okrika", "Ondo", "Onitsha", "Orlu", "Osogbo", "Ota", "Otukpo", "Owerri", "Owo",
  "Oyo", "Port Harcourt", "Potiskum", "Sagamu", "Sapele", "Sokoto", "Suleja",
  "Surulere", "Ubiaja", "Ughelli", "Umuahia", "Uromi", "Uyo", "Victoria Island",
  "Warri", "Wukari", "Yaba", "Yenagoa", "Yola", "Zaria",
].sort((a, b) => a.localeCompare(b));

// Full location label as stored/displayed, e.g. "Lagos, Nigeria".
export function cityLabel(city: string): string {
  return `${city}, Nigeria`;
}

/**
 * A valid Nigerian mobile national significant number is 10 digits, beginning
 * with 7, 8 or 9 followed by 0 or 1 (e.g. 803, 806, 705, 812, 903, 913...).
 * `national` must be the 10-digit string WITHOUT the leading 0 or +234.
 */
export function isValidNigerianMobile(national: string): boolean {
  return /^[789][01]\d{8}$/.test(national);
}

// Extract the 10-digit national number from any input (+234…, 0…, spaced, etc.).
export function toNationalDigits(input: string): string {
  let d = (input || "").replace(/\D/g, "");
  if (d.startsWith("234")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

// Format a national number for display: "803 123 4567".
export function formatNationalPhone(national: string): string {
  const d = national.slice(0, 10);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 10)].filter(Boolean);
  return parts.join(" ");
}

// E.164 form for storage, e.g. "+2348031234567".
export function toE164(national: string): string {
  return national ? `+234${national}` : "";
}
