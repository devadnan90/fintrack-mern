const DEFAULT_BRAND_HEX = "#2f4bc0";
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}
function mix(rgb, target, weight) {
  return {
    r: Math.round(rgb.r + (target.r - rgb.r) * weight),
    g: Math.round(rgb.g + (target.g - rgb.g) * weight),
    b: Math.round(rgb.b + (target.b - rgb.b) * weight),
  };
}
function triplet(rgb) {
  return `${rgb.r} ${rgb.g} ${rgb.b}`;
}
export function isValidHexColor(value) {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
export function shadesFromHex(hex) {
  const white = {
    r: 255,
    g: 255,
    b: 255,
  };
  const black = {
    r: 0,
    g: 0,
    b: 0,
  };
  const base600 = hexToRgb(isValidHexColor(hex) ? hex : DEFAULT_BRAND_HEX);
  const base500 = mix(base600, white, 0.2);
  return {
    50: triplet(mix(base600, white, 0.92)),
    100: triplet(mix(base600, white, 0.82)),
    500: triplet(base500),
    600: triplet(base600),
    700: triplet(mix(base600, black, 0.22)),
  };
}
export function applyAccentColor(hex) {
  const root = document.documentElement;
  if (!hex) {
    ["50", "100", "500", "600", "700"].forEach((k) =>
      root.style.removeProperty(`--brand-${k}`),
    );
    return;
  }
  const shades = shadesFromHex(hex);
  for (const [key, value] of Object.entries(shades)) {
    root.style.setProperty(`--brand-${key}`, value);
  }
}
