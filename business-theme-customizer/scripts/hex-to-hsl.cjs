/**
 * Utility to convert Hex color to Tailwind-compatible HSL values.
 * Expects #RRGGBB format and outputs "H S% L%" (without hsl() wrapper).
 */
function hexToHsl(hex) {
  hex = hex.replace(/^#/, '');
  
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node hex-to-hsl.cjs #HEXCOLOR");
  process.exit(1);
}

console.log(hexToHsl(args[0]));
