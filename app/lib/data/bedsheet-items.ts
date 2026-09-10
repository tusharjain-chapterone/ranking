export interface BedsheetItem {
  sku: string; // AND-number, matches store's SKU/barcode convention
  mpn: string; // HOKIPO-style code, goes to Google Shopping MPN
  title: string;
  description: string;
  price: number;
  weightG: number;
  vendorCost: number;
}

const ALLURE_TAGS = "Bedsheet, Bedsheets, Cotton Bedsheet, King Size Bedsheet, New Launch, 180 TC Cotton Twill";
const HIBOND_TAGS = "Bedsheet, Bedsheets, Cotton Bedsheet, King Size Bedsheet, New Launch, 180 TC Cotton Percale";
const FEATHER_TAGS = "Bedsheet, Bedsheets, Cotton Bedsheet, King Size Bedsheet, New Launch, 300 TC Cotton Sateen";
const VINTAGE_TAGS = "Bedsheet, Bedsheets, Cotton Bedsheet, King Size Bedsheet, New Launch, 210 TC Cotton Sateen";

export const BEDSHEET_ITEMS: (BedsheetItem & { tags: string })[] = [
  // Allure Collection - 180 TC Cotton Twill - price 2299, weight 1250g, cost 660
  {
    sku: "AND038026", mpn: "HOKIPO-BDSHT-KING-D1-IN1397", tags: ALLURE_TAGS,
    title: "HOKIPO Floral 180 TC Cotton Twill Flat Bedsheet in King Size, Blue & Red",
    description: "The HOKIPO English Rose Floral Bedsheet features a detailed floral pattern inspired by classic English rose gardens. The arrangement of flowers and foliage creates a decorative look that adds character to the bedroom while remaining easy to style. Made from 100% cotton with a 180 TC twill weave, the bedsheet offers a comfortable feel with a subtle textured finish. The naturally breathable cotton fabric makes it suitable for everyday bedding and regular use. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same floral design.",
    price: 2299, weightG: 1250, vendorCost: 660,
  },
  {
    sku: "AND038027", mpn: "HOKIPO-BDSHT-KING-D2-IN1397", tags: ALLURE_TAGS,
    title: "HOKIPO Floral 180 TC Cotton Twill Flat Bedsheet in King Size, Blue & White",
    description: "The HOKIPO English Rose Floral Bedsheet features a detailed floral pattern inspired by classic English rose gardens. The arrangement of flowers and foliage creates a decorative look that adds character to the bedroom while remaining easy to style. Made from 100% cotton with a 180 TC twill weave, the bedsheet offers a comfortable feel with a subtle textured finish. The naturally breathable cotton fabric makes it suitable for everyday bedding and regular use. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same floral design.",
    price: 2299, weightG: 1250, vendorCost: 660,
  },
  {
    sku: "AND038028", mpn: "HOKIPO-BDSHT-KING-D3-IN1397", tags: ALLURE_TAGS,
    title: "HOKIPO Floral 180 TC Cotton Twill Flat Bedsheet in King Size, Old Rose",
    description: "The HOKIPO Jacobean Floral Bedsheet features an intricate floral and botanical pattern inspired by classic Jacobean-style motifs. The detailed design gives the bedding a timeless decorative look while keeping the overall appearance soft and understated. Made from 100% cotton with a 180 TC twill weave, the bedsheet offers a comfortable feel with a subtle textured finish. Its naturally breathable cotton fabric makes it suitable for everyday bedding and comfortable use across different seasons. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same floral design.",
    price: 2299, weightG: 1250, vendorCost: 660,
  },
  {
    sku: "AND038029", mpn: "HOKIPO-BDSHT-KING-D4-IN1397", tags: ALLURE_TAGS,
    title: "HOKIPO Floral 180 TC Cotton Twill Flat Bedsheet in King Size, Aquamarine",
    description: "The HOKIPO Jacobean Floral Bedsheet features an intricate floral and botanical pattern inspired by classic Jacobean-style motifs. The detailed design gives the bedding a timeless decorative look while keeping the overall appearance soft and understated. Made from 100% cotton with a 180 TC twill weave, the bedsheet offers a comfortable feel with a subtle textured finish. Its naturally breathable cotton fabric makes it suitable for everyday bedding and comfortable use across different seasons. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same floral design.",
    price: 2299, weightG: 1250, vendorCost: 660,
  },
  {
    sku: "AND038030", mpn: "HOKIPO-BDSHT-KING-D5-IN1397", tags: ALLURE_TAGS,
    title: "HOKIPO 180 TC Cotton Twill Flat Bedsheet in King Size, Purple & Pink",
    description: "The HOKIPO Brushstroke Stripe Bedsheet is made from 100% cotton with a 180 TC twill weave, offering a comfortable feel with a naturally textured finish. The design features broad vertical stripes with subtle brushstroke-inspired detailing, creating a clean and contemporary pattern. The balanced stripe pattern adds character to the bed without making the overall look too busy. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2299, weightG: 1250, vendorCost: 660,
  },
  {
    sku: "AND038031", mpn: "HOKIPO-BDSHT-KING-D6-IN1397", tags: ALLURE_TAGS,
    title: "HOKIPO 180 TC Cotton Twill Flat Bedsheet in King Size, Mustard & Green",
    description: "The HOKIPO Brushstroke Stripe Bedsheet is made from 100% cotton with a 180 TC twill weave, offering a comfortable feel with a naturally textured finish. The design features broad vertical stripes with subtle brushstroke-inspired detailing, creating a clean and contemporary pattern. The balanced stripe pattern adds character to the bed without making the overall look too busy. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2299, weightG: 1250, vendorCost: 660,
  },

  // Hibond Collection - 180 TC Cotton Percale - price 2499, weight 1080g, cost 710
  {
    sku: "AND038032", mpn: "HOKIPO-BDSHT-KING-D1-IN1398", tags: HIBOND_TAGS,
    title: "HOKIPO Line Art 180 TC Cotton Percale Flat Bedsheet, King Size, Powder Blue",
    description: "The HOKIPO Daisy Line Art Bedsheet features a delicate botanical pattern created with fine floral outlines, flowing stems and leaves. The clean line-art style gives the design a graceful and understated look. Made from 100% cotton with a 180 TC percale weave, the bedsheet has a lightweight, crisp and comfortable feel. Its breathable cotton construction makes it suitable for everyday bedding and regular use. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2499, weightG: 1080, vendorCost: 710,
  },
  {
    sku: "AND038033", mpn: "HOKIPO-BDSHT-KING-D2-IN1398", tags: HIBOND_TAGS,
    title: "HOKIPO Vintage 180 TC Cotton Percale Flat Bedsheet, King Size, Blue & Grey",
    description: "The HOKIPO Vintage Bouquet Bedsheet features a detailed arrangement of floral bouquets and botanical elements, giving the bedding a classic and decorative character. The repeating floral artwork adds detail to the bed while maintaining a balanced overall look. Made from 100% cotton with a 180 TC percale weave, the bedsheet has a lightweight, crisp and comfortable feel. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2499, weightG: 1080, vendorCost: 710,
  },
  {
    sku: "AND038034", mpn: "HOKIPO-BDSHT-KING-D3-IN1398", tags: HIBOND_TAGS,
    title: "HOKIPO Botanical 180 TC Cotton Percale Flat Bedsheet, King Size, Seaweed",
    description: "The HOKIPO Botanical Stems Bedsheet features a repeating pattern of slender stems and detailed leaves, creating a natural and understated look. The fine botanical artwork adds visual detail to the bedding while keeping the overall design clean and balanced. Made from 100% cotton with a 180 TC percale weave, the bedsheet has a lightweight, crisp and comfortable feel. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2499, weightG: 1080, vendorCost: 710,
  },
  {
    sku: "AND038035", mpn: "HOKIPO-BDSHT-KING-D4-IN1398", tags: HIBOND_TAGS,
    title: "HOKIPO Geometric 180 TC Cotton Percale Flat Bedsheet, King Size, Green Teal",
    description: "The HOKIPO Hexagonia Geometric Bedsheet features a repeating hexagonal pattern with fine geometric detailing, creating a structured and contemporary look. The layered shapes add depth to the design while keeping the overall pattern balanced. Made from 100% cotton with a 180 TC percale weave, the bedsheet has a lightweight, crisp and comfortable feel. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2499, weightG: 1080, vendorCost: 710,
  },
  {
    sku: "AND038036", mpn: "HOKIPO-BDSHT-KING-D5-IN1398", tags: HIBOND_TAGS,
    title: "HOKIPO Geometric 180 TC Cotton Percale Flat Bedsheet, King Size, Buff Grey",
    description: "The HOKIPO Hexagonia Geometric Bedsheet features a repeating hexagonal pattern with fine geometric detailing, creating a structured and contemporary look. The layered shapes add depth to the design while keeping the overall pattern balanced. Made from 100% cotton with a 180 TC percale weave, the bedsheet has a lightweight, crisp and comfortable feel. Designed for a king size bed, the set includes 1 flat bedsheet and 2 matching pillow covers featuring the same design.",
    price: 2499, weightG: 1080, vendorCost: 710,
  },

  // Feather Touch Collection - 300 TC Cotton Sateen - price 2899, weight 1270g, cost 850
  {
    sku: "AND038037", mpn: "HOKIPO-BDSHT-KING-D1-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Cherry Blossom 300 TC Cotton Sateen Flat Bedsheet, King, Pink Cream",
    description: "The HOKIPO Cherry Blossom Botanical Bedsheet features delicate flowering branches spread across the fabric in a flowing botanical arrangement. The fine stems, leaves and blossoms create a detailed floral pattern that adds character to the bed while keeping the overall look graceful. Made from 100% cotton with a 300 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, with the same botanical design carried across the complete set.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },
  {
    sku: "AND038038", mpn: "HOKIPO-BDSHT-KING-D2-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Cherry Blossom 300TC Cotton Sateen Flat Bedsheet, King, Seaweed & Sage",
    description: "The HOKIPO Cherry Blossom Botanical Bedsheet features delicate flowering branches spread across the fabric in a flowing botanical arrangement. The fine stems, leaves and blossoms create a detailed floral pattern that adds character to the bed while keeping the overall look graceful. Made from 100% cotton with a 300 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, with the same botanical design carried across the complete set.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },
  {
    sku: "AND038039", mpn: "HOKIPO-BDSHT-KING-D3-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Timeless Paisley 300 TC Cotton Sateen Flat Bedsheet, King Size, Grey",
    description: "The HOKIPO Timeless Paisley Bedsheet features an intricate all-over paisley pattern made up of curved motifs and fine decorative details. The closely arranged artwork gives the bedding a rich, classic appearance while keeping the design consistent across the bed. Made from 100% cotton with a 300 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, carrying the same paisley design across the complete set.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },
  {
    sku: "AND038040", mpn: "HOKIPO-BDSHT-KING-D4-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Geometric 300 TC Cotton Sateen Flat Bedsheet, King, Mustard & Ochre",
    description: "The HOKIPO Interlace Geometric Bedsheet features a repeating pattern of fine lines and geometric shapes that come together to create an interlinked design. The layered pattern adds visual detail to the bedding while maintaining a clean and organised look. Made from 100% cotton with a 300 TC sateen weave, the bedsheet has a smooth, soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, with the same geometric design carried across the set.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },
  {
    sku: "AND038041", mpn: "HOKIPO-BDSHT-KING-D5-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Geometric 300 TC Cotton Sateen Flat Bedsheet, King Size, Teal Grey",
    description: "The HOKIPO Interlace Geometric Bedsheet features a repeating pattern of fine lines and geometric shapes that come together to create an interlinked design. The layered pattern adds visual detail to the bedding while maintaining a clean and organised look. Made from 100% cotton with a 300 TC sateen weave, the bedsheet has a smooth, soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, with the same geometric design carried across the set.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },
  {
    sku: "AND038042", mpn: "HOKIPO-BDSHT-KING-D6-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Floral 300TC Cotton Sateen Flat Bedsheet, King Size, Teal & Ochre",
    description: "The HOKIPO Petite Fleur Floral Bedsheet features a delicate botanical pattern inspired by small blooming flowers and fine leafy stems. The design is spread across the fabric to give the bed a soft, graceful look without making the pattern feel too heavy. Made from 300 TC cotton sateen, the bedsheet has a smooth and comfortable feel with a subtle natural sheen. The set includes 1 flat bedsheet and 2 matching pillow covers, making it easy to create a coordinated look.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },
  {
    sku: "AND038043", mpn: "HOKIPO-BDSHT-KING-D7-IN1399", tags: FEATHER_TAGS,
    title: "HOKIPO Floral 300TC Cotton Sateen Flat Bedsheet, King, Ochre & Lavender",
    description: "The HOKIPO Petite Fleur Floral Bedsheet features a delicate botanical pattern inspired by small blooming flowers and fine leafy stems. The design is spread across the fabric to give the bed a soft, graceful look without making the pattern feel too heavy. Made from 300 TC cotton sateen, the bedsheet has a smooth and comfortable feel with a subtle natural sheen. The set includes 1 flat bedsheet and 2 matching pillow covers, making it easy to create a coordinated look.",
    price: 2899, weightG: 1270, vendorCost: 850,
  },

  // Vintage Collection - 210 TC Cotton Sateen - price 2599, weight 1280g, cost 745
  {
    sku: "AND038044", mpn: "HOKIPO-BDSHT-KING-D1-IN1400", tags: VINTAGE_TAGS,
    title: "HOKIPO Floral 210 TC Cotton Sateen Flat Bedsheet, King, Beige & Ivory",
    description: "The HOKIPO Bloomscape Floral Bedsheet features a full floral pattern with blooming flowers and leafy botanical elements spread across the fabric. The combination of larger blooms and smaller details creates a rich, flowing design that brings plenty of character to the bed. Made from 100% cotton with a 210 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, with the floral design carried across the complete set.",
    price: 2599, weightG: 1280, vendorCost: 745,
  },
  {
    sku: "AND038045", mpn: "HOKIPO-BDSHT-KING-D2-IN1400", tags: VINTAGE_TAGS,
    title: "HOKIPO Botanical 210 TC Cotton Sateen Flat Bedsheet, King, Cream & Blue",
    description: "The HOKIPO Overlay Botanical Bedsheet features a flowing arrangement of leaves and botanical elements layered across the fabric. The overlapping design creates a soft sense of movement and adds detail to the bedding without making the pattern feel too busy. Made from 100% cotton with a 210 TC sateen weave, it has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, carrying the same botanical design across the set.",
    price: 2599, weightG: 1280, vendorCost: 745,
  },
  {
    sku: "AND038046", mpn: "HOKIPO-BDSHT-KING-D3-IN1400", tags: VINTAGE_TAGS,
    title: "HOKIPO Suzani Patchwork 210 TC Cotton Sateen Flat Bedsheet, King, Violet",
    description: "Bring a detailed, classic look to your bedroom with the HOKIPO Suzani Patchwork Bedsheet. The design combines floral, leaf and ornamental motifs in a patchwork-style arrangement, giving the bedding plenty of character while keeping the overall look balanced. Made from 100% cotton with a 210 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, so the design comes together across the bed for a complete look.",
    price: 2599, weightG: 1280, vendorCost: 745,
  },
  {
    sku: "AND038047", mpn: "HOKIPO-BDSHT-KING-D4-IN1400", tags: VINTAGE_TAGS,
    title: "HOKIPO Suzani Patchwork 210 TC Cotton Sateen Flat Bedsheet, King Size, Sand",
    description: "Bring a detailed, classic look to your bedroom with the HOKIPO Suzani Patchwork Bedsheet. The design combines floral, leaf and ornamental motifs in a patchwork-style arrangement, giving the bedding plenty of character while keeping the overall look balanced. Made from 100% cotton with a 210 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, so the design comes together across the bed for a complete look.",
    price: 2599, weightG: 1280, vendorCost: 745,
  },
  {
    sku: "AND038048", mpn: "HOKIPO-BDSHT-KING-D5-IN1400", tags: VINTAGE_TAGS,
    title: "HOKIPO Geometric 210 TC Cotton Sateen Flat Bedsheet, King Size, Teal Eggshell",
    description: "The HOKIPO Interlink Geometric Bedsheet features a repeating geometric pattern made with fine lines and layered shapes. The interlinked design gives the bedding a modern, structured look while keeping the pattern balanced across the bed. Made from 100% cotton with a 210 TC sateen weave, the bedsheet has a smooth and soft feel with a subtle natural sheen. The king size set includes 1 flat bedsheet and 2 matching pillow covers, bringing the same coordinated design across the bedding.",
    price: 2599, weightG: 1280, vendorCost: 745,
  },
];
