const rawMetrikaId = import.meta.env.PUBLIC_YANDEX_METRIKA_ID?.trim();
const rawMeasurementId = import.meta.env.PUBLIC_GOOGLE_ANALYTICS_ID?.trim();

if (rawMetrikaId && (!/^\d+$/.test(rawMetrikaId) || !Number.isSafeInteger(Number(rawMetrikaId)) || Number(rawMetrikaId) <= 0)) {
  throw new TypeError('PUBLIC_YANDEX_METRIKA_ID must be a positive integer.');
}
if (rawMeasurementId && !/^G-[A-Z0-9]+$/.test(rawMeasurementId)) {
  throw new TypeError('PUBLIC_GOOGLE_ANALYTICS_ID must be a GA4 measurement ID (G-...).');
}

export const analyticsConfig = {
  metrikaId: rawMetrikaId || undefined,
  measurementId: rawMeasurementId || undefined,
  enabled: Boolean(rawMetrikaId || rawMeasurementId),
};
