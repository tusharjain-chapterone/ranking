export interface BedsheetVariant {
  sku: string; // AND-number, matches store's SKU/barcode convention
  mpn: string; // HOKIPO-style code, goes to Google Shopping MPN
  color: string;
}

export interface BedsheetProduct {
  handle: string;
  title: string;
  intro: string;
  body2: string;
  weightG: number;
  price: number;
  vendorCost: number;
  colorUnion: string;
  variants: BedsheetVariant[];
}

export const BEDSHEET_PRODUCTS: BedsheetProduct[] = [
  {
    handle: "hokipo-allure-collection-180-tc-cotton-twill-bedsheet-king-size",
    title: "HOKIPO Allure Collection 180 TC Cotton Twill Printed Bedsheet, King Size",
    intro:
      "The HOKIPO Allure Collection brings together three floral and stripe designs - English Rose, Jacobean, and Brushstrokes - each available in two colourways. Made from 100% cotton with a 180 TC twill weave, the fabric has a comfortable feel with a subtle woven texture that suits everyday bedding.",
    body2:
      "Each set includes 1 king size flat bedsheet (108 x 108 in) and 2 matching pillow covers (17 x 27 in, with flange). The breathable cotton construction makes it comfortable for year-round use.",
    weightG: 1250,
    price: 2299,
    vendorCost: 660,
    colorUnion: "blue; red; white; pink; green; mustard",
    variants: [
      { sku: "AND038026", mpn: "HOKIPO-BDSHT-KING-D1-IN1397", color: "Blue & Red" },
      { sku: "AND038027", mpn: "HOKIPO-BDSHT-KING-D2-IN1397", color: "Blue & White" },
      { sku: "AND038028", mpn: "HOKIPO-BDSHT-KING-D3-IN1397", color: "Old Rose" },
      { sku: "AND038029", mpn: "HOKIPO-BDSHT-KING-D4-IN1397", color: "Aquamarine" },
      { sku: "AND038030", mpn: "HOKIPO-BDSHT-KING-D5-IN1397", color: "Purple & Pink" },
      { sku: "AND038031", mpn: "HOKIPO-BDSHT-KING-D6-IN1397", color: "Mustard & Green" },
    ],
  },
  {
    handle: "hokipo-hibond-collection-180-tc-cotton-percale-bedsheet-king-size",
    title: "HOKIPO Hibond Collection 180 TC Cotton Percale Printed Bedsheet, King Size",
    intro:
      "The HOKIPO Hibond Collection features four line-art and botanical prints - Daisy, Vintage Florals, Botania, and Hexagonia - woven in a lightweight, crisp 180 TC cotton percale that feels light against the skin.",
    body2:
      "Each set includes 1 king size flat bedsheet (108 x 108 in) and 2 matching pillow covers (17 x 27 in, with flange). The breathable cotton construction makes it comfortable for year-round use.",
    weightG: 1080,
    price: 2499,
    vendorCost: 710,
    colorUnion: "blue; gray; green; teal; beige",
    variants: [
      { sku: "AND038032", mpn: "HOKIPO-BDSHT-KING-D1-IN1398", color: "Powder Blue" },
      { sku: "AND038033", mpn: "HOKIPO-BDSHT-KING-D2-IN1398", color: "Blue & Grey" },
      { sku: "AND038034", mpn: "HOKIPO-BDSHT-KING-D3-IN1398", color: "Seaweed" },
      { sku: "AND038035", mpn: "HOKIPO-BDSHT-KING-D4-IN1398", color: "Green & Teal" },
      { sku: "AND038036", mpn: "HOKIPO-BDSHT-KING-D5-IN1398", color: "Buff & Grey" },
    ],
  },
  {
    handle: "hokipo-feather-touch-collection-300-tc-cotton-sateen-bedsheet-king-size",
    title: "HOKIPO Feather Touch Collection 300 TC Cotton Sateen Printed Bedsheet, King Size",
    intro:
      "The HOKIPO Feather Touch Collection offers four refined botanical and geometric prints - Cherry Blossom, Timeless Paisley, Geometric Interlace, and Fleur Petite - in a smooth, soft 300 TC cotton sateen weave with a subtle natural sheen.",
    body2:
      "Each set includes 1 king size flat bedsheet (108 x 108 in) and 2 matching pillow covers (17 x 27 in, with flange). The breathable cotton construction makes it comfortable for year-round use.",
    weightG: 1270,
    price: 2899,
    vendorCost: 850,
    colorUnion: "pink; green; gray; yellow; teal; purple",
    variants: [
      { sku: "AND038037", mpn: "HOKIPO-BDSHT-KING-D1-IN1399", color: "Pink & Cream" },
      { sku: "AND038038", mpn: "HOKIPO-BDSHT-KING-D2-IN1399", color: "Seaweed & Sage" },
      { sku: "AND038039", mpn: "HOKIPO-BDSHT-KING-D3-IN1399", color: "Grey" },
      { sku: "AND038040", mpn: "HOKIPO-BDSHT-KING-D4-IN1399", color: "Mustard & Ochre" },
      { sku: "AND038041", mpn: "HOKIPO-BDSHT-KING-D5-IN1399", color: "Teal & Grey" },
      { sku: "AND038042", mpn: "HOKIPO-BDSHT-KING-D6-IN1399", color: "Teal & Ochre" },
      { sku: "AND038043", mpn: "HOKIPO-BDSHT-KING-D7-IN1399", color: "Ochre & Lavender" },
    ],
  },
  {
    handle: "hokipo-vintage-collection-210-tc-cotton-sateen-bedsheet-king-size",
    title: "HOKIPO Vintage Collection 210 TC Cotton Sateen Printed Bedsheet, King Size",
    intro:
      "The HOKIPO Vintage Collection brings four detailed patterns - Bloomscape, Overlay Florals, Suzani Grid, and Interlink - to a smooth 210 TC cotton sateen weave with a graceful drape.",
    body2:
      "Each set includes 1 king size flat bedsheet (108 x 108 in) and 2 matching pillow covers (17 x 27 in, with flange). The breathable cotton construction makes it comfortable for year-round use.",
    weightG: 1280,
    price: 2599,
    vendorCost: 745,
    colorUnion: "blue; beige; ivory; violet; multicolor",
    variants: [
      { sku: "AND038044", mpn: "HOKIPO-BDSHT-KING-D1-IN1400", color: "Blue, Beige & Ivory" },
      { sku: "AND038045", mpn: "HOKIPO-BDSHT-KING-D2-IN1400", color: "Beige, Cream & Blue" },
      { sku: "AND038046", mpn: "HOKIPO-BDSHT-KING-D3-IN1400", color: "Violet" },
      { sku: "AND038047", mpn: "HOKIPO-BDSHT-KING-D4-IN1400", color: "Sand" },
      { sku: "AND038048", mpn: "HOKIPO-BDSHT-KING-D5-IN1400", color: "Teal & Eggshell" },
    ],
  },
];
