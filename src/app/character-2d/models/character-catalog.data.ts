/**
 * V-Me 2D Character Catalog
 * Every dropdown/preset option the Character Creator UI shows.
 * This file has ZERO logic — it is pure data. The renderer and
 * animator services already read the Character2D model fields
 * directly (faceShape, eyeShape, bangs, etc.) and draw them
 * parametrically, so "all looks" comes from combining these
 * discrete options with the continuous sliders (size, tilt,
 * width, color) already defined in character-2d.models.ts.
 *
 * To add a new look: add one line to the right array below.
 * No new rendering code is required for options that reuse an
 * existing shape family (e.g. a new hair color is just a color
 * picker value, not a catalog entry).
 */

import {
  BodyShape,
  FaceShape,
  EyeShape,
  NoseShape,
  MouthShape,
  BrowShape,
  ChinShape,
  EarShape,
  HairLength,
  HairTexture,
  BangsStyle,
  OutfitType,
  FitType,
  SleeveType,
  NecklineType,
  AccessoryType,
} from './character-2d.models';

export interface CatalogOption<T = string> {
  value: T;
  label: string;
}

export const BODY_SHAPES: CatalogOption<BodyShape>[] = [
  { value: 'petite', label: 'Petite' },
  { value: 'slim', label: 'Slim' },
  { value: 'athletic', label: 'Athletic' },
  { value: 'curvy', label: 'Curvy' },
  { value: 'muscular', label: 'Muscular' },
  { value: 'androgynous', label: 'Androgynous' },
  { value: 'custom', label: 'Custom (use sliders)' },
];

export const FACE_SHAPES: CatalogOption<FaceShape>[] = [
  { value: 'round', label: 'Round' },
  { value: 'oval', label: 'Oval' },
  { value: 'square', label: 'Square' },
  { value: 'heart', label: 'Heart' },
  { value: 'oblong', label: 'Oblong' },
  { value: 'diamond', label: 'Diamond' },
  { value: 'triangle', label: 'Triangle' },
];

export const EYE_SHAPES: CatalogOption<EyeShape>[] = [
  { value: 'round', label: 'Round' },
  { value: 'almond', label: 'Almond' },
  { value: 'hooded', label: 'Hooded' },
  { value: 'upturned', label: 'Upturned (cat-like)' },
  { value: 'downturned', label: 'Downturned (soft)' },
  { value: 'monolid', label: 'Monolid' },
  { value: 'cat-eye', label: 'Cat-Eye' },
];

export const NOSE_SHAPES: CatalogOption<NoseShape>[] = [
  { value: 'button', label: 'Button' },
  { value: 'bulbous', label: 'Bulbous' },
  { value: 'pointed', label: 'Pointed' },
  { value: 'crooked', label: 'Crooked' },
  { value: 'upturned', label: 'Upturned' },
  { value: 'downturned', label: 'Downturned' },
  { value: 'snub', label: 'Snub' },
];

export const MOUTH_SHAPES: CatalogOption<MouthShape>[] = [
  { value: 'full', label: 'Full' },
  { value: 'thin', label: 'Thin' },
  { value: 'heart-shaped', label: 'Heart-shaped' },
  { value: 'uneven', label: 'Uneven / Asymmetric' },
  { value: 'wide', label: 'Wide' },
  { value: 'small', label: 'Small' },
];

export const BROW_SHAPES: CatalogOption<BrowShape>[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'arched', label: 'Arched' },
  { value: 'upturned', label: 'Upturned' },
  { value: 'downturned', label: 'Downturned' },
  { value: 'angled', label: 'Angled' },
  { value: 'soft', label: 'Soft' },
];

export const CHIN_SHAPES: CatalogOption<ChinShape>[] = [
  { value: 'pointed', label: 'Pointed' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'square', label: 'Square' },
  { value: 'prominent', label: 'Prominent' },
  { value: 'receding', label: 'Receding' },
  { value: 'soft', label: 'Soft' },
];

export const EAR_SHAPES: CatalogOption<EarShape>[] = [
  { value: 'elf', label: 'Elf' },
  { value: 'round', label: 'Round' },
  { value: 'pointed', label: 'Pointed' },
  { value: 'square', label: 'Square' },
  { value: 'prominent', label: 'Prominent' },
  { value: 'flat', label: 'Flat' },
];

export const HAIR_LENGTHS: CatalogOption<HairLength>[] = [
  { value: 'buzzcut', label: 'Buzzcut' },
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'waist', label: 'Waist-length' },
  { value: 'floor', label: 'Floor-length' },
];

export const HAIR_TEXTURES: CatalogOption<HairTexture>[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'wavy', label: 'Wavy' },
  { value: 'curly', label: 'Curly' },
  { value: 'coily', label: 'Coily' },
  { value: 'afro', label: 'Afro' },
  { value: 'braided', label: 'Braided' },
  { value: 'zigzag', label: 'Zigzag / Box braids' },
];

export const BANGS_STYLES: CatalogOption<BangsStyle>[] = [
  { value: 'none', label: 'None' },
  { value: 'straight', label: 'Straight / Blunt' },
  { value: 'side-swept', label: 'Side-swept' },
  { value: 'wispy', label: 'Wispy' },
  { value: 'blunt', label: 'Blunt' },
  { value: 'curtain', label: 'Curtain' },
  { value: 'shaggy', label: 'Shaggy' },
];

/** 30 named starting-point hairstyle presets (styleId). These map to
 * combinations of length + texture + bangs above; the renderer draws
 * them procedurally, so a "style" is really a named preset the user
 * can pick, then still fine-tune with the sliders. */
export const HAIRSTYLE_PRESETS: {
  id: string;
  label: string;
  length: HairLength;
  texture: HairTexture;
  bangs: BangsStyle;
}[] = [
  { id: 'pixie-crop', label: 'Pixie Crop', length: 'short', texture: 'straight', bangs: 'side-swept' },
  { id: 'buzz', label: 'Buzz Cut', length: 'buzzcut', texture: 'straight', bangs: 'none' },
  { id: 'bob-blunt', label: 'Blunt Bob', length: 'short', texture: 'straight', bangs: 'blunt' },
  { id: 'bob-wavy', label: 'Wavy Bob', length: 'short', texture: 'wavy', bangs: 'side-swept' },
  { id: 'shoulder-straight', label: 'Shoulder-length Straight', length: 'medium', texture: 'straight', bangs: 'none' },
  { id: 'shoulder-curly', label: 'Shoulder-length Curly', length: 'medium', texture: 'curly', bangs: 'wispy' },
  { id: 'long-straight', label: 'Long Straight', length: 'long', texture: 'straight', bangs: 'side-swept' },
  { id: 'long-wavy', label: 'Long Wavy', length: 'long', texture: 'wavy', bangs: 'curtain' },
  { id: 'long-curly', label: 'Long Curly', length: 'long', texture: 'curly', bangs: 'none' },
  { id: 'afro-medium', label: 'Afro', length: 'medium', texture: 'afro', bangs: 'none' },
  { id: 'afro-large', label: 'Big Afro', length: 'long', texture: 'afro', bangs: 'none' },
  { id: 'box-braids', label: 'Box Braids', length: 'long', texture: 'braided', bangs: 'none' },
  { id: 'cornrows', label: 'Cornrows', length: 'medium', texture: 'braided', bangs: 'none' },
  { id: 'coily-short', label: 'Short Coily', length: 'short', texture: 'coily', bangs: 'none' },
  { id: 'coily-long', label: 'Long Coily', length: 'long', texture: 'coily', bangs: 'none' },
  { id: 'waist-straight', label: 'Waist-length Straight', length: 'waist', texture: 'straight', bangs: 'none' },
  { id: 'floor-fantasy', label: 'Floor-length (Fantasy)', length: 'floor', texture: 'straight', bangs: 'none' },
  { id: 'shag', label: 'Shag', length: 'medium', texture: 'wavy', bangs: 'shaggy' },
  { id: 'undercut', label: 'Undercut', length: 'short', texture: 'straight', bangs: 'none' },
  { id: 'curtain-medium', label: 'Curtain Bangs Medium', length: 'medium', texture: 'straight', bangs: 'curtain' },
  { id: 'zigzag-braids', label: 'Zigzag Braids', length: 'medium', texture: 'zigzag', bangs: 'none' },
  { id: 'wispy-pixie', label: 'Wispy Pixie', length: 'buzzcut', texture: 'wavy', bangs: 'wispy' },
  { id: 'long-braided', label: 'Single Long Braid', length: 'long', texture: 'braided', bangs: 'side-swept' },
  { id: 'curly-crop', label: 'Curly Crop', length: 'short', texture: 'curly', bangs: 'wispy' },
  { id: 'wavy-lob', label: 'Wavy Lob', length: 'medium', texture: 'wavy', bangs: 'none' },
  { id: 'straight-bangs', label: 'Straight with Full Bangs', length: 'medium', texture: 'straight', bangs: 'straight' },
  { id: 'afro-puff', label: 'Afro Puff', length: 'short', texture: 'afro', bangs: 'none' },
  { id: 'braided-crown', label: 'Braided Crown', length: 'long', texture: 'braided', bangs: 'curtain' },
  { id: 'messy-curly', label: 'Messy Curly', length: 'medium', texture: 'curly', bangs: 'shaggy' },
  { id: 'sleek-long', label: 'Sleek Long', length: 'waist', texture: 'straight', bangs: 'none' },
];

export const OUTFIT_TYPES: CatalogOption<OutfitType>[] = [
  { value: 'top', label: 'Top' },
  { value: 'bottom', label: 'Bottom' },
  { value: 'dress', label: 'Dress' },
  { value: 'shoes', label: 'Shoes' },
  { value: 'outerwear', label: 'Outerwear' },
];

export const FIT_TYPES: CatalogOption<FitType>[] = [
  { value: 'tight', label: 'Tight' },
  { value: 'fitted', label: 'Fitted' },
  { value: 'loose', label: 'Loose' },
  { value: 'oversized', label: 'Oversized' },
  { value: 'bodycon', label: 'Bodycon' },
];

export const SLEEVE_TYPES: CatalogOption<SleeveType>[] = [
  { value: 'sleeveless', label: 'Sleeveless' },
  { value: 'short', label: 'Short' },
  { value: 'three-quarter', label: 'Three-quarter' },
  { value: 'long', label: 'Long' },
  { value: 'bell', label: 'Bell' },
  { value: 'puffed', label: 'Puffed' },
];

export const NECKLINE_TYPES: CatalogOption<NecklineType>[] = [
  { value: 'crew', label: 'Crew' },
  { value: 'v-neck', label: 'V-neck' },
  { value: 'off-shoulder', label: 'Off-shoulder' },
  { value: 'halter', label: 'Halter' },
  { value: 'boat', label: 'Boat' },
  { value: 'turtleneck', label: 'Turtleneck' },
  { value: 'sweetheart', label: 'Sweetheart' },
];

/** 20 named outfit style presets. Each is a styleId string stored on
 * an OutfitLayers entry; the renderer's renderTopWear/renderBottomWear
 * read `fit`, `sleeves`, `neckline` and `colors` directly, so the
 * styleId is mostly a label/grouping today and a hook for future
 * silhouette variation. */
export const OUTFIT_STYLE_PRESETS: { id: string; label: string; type: OutfitType }[] = [
  { id: 'casual-tshirt', label: 'Casual T-Shirt', type: 'top' },
  { id: 'button-shirt', label: 'Button-up Shirt', type: 'top' },
  { id: 'tank-top', label: 'Tank Top', type: 'top' },
  { id: 'blouse', label: 'Blouse', type: 'top' },
  { id: 'hoodie', label: 'Hoodie', type: 'top' },
  { id: 'sweater', label: 'Sweater', type: 'top' },
  { id: 'crop-top', label: 'Crop Top', type: 'top' },
  { id: 'casual-jeans', label: 'Jeans', type: 'bottom' },
  { id: 'shorts', label: 'Shorts', type: 'bottom' },
  { id: 'skirt-mini', label: 'Mini Skirt', type: 'bottom' },
  { id: 'skirt-maxi', label: 'Maxi Skirt', type: 'bottom' },
  { id: 'cargo-pants', label: 'Cargo Pants', type: 'bottom' },
  { id: 'leggings', label: 'Leggings', type: 'bottom' },
  { id: 'sundress', label: 'Sundress', type: 'dress' },
  { id: 'evening-gown', label: 'Evening Gown', type: 'dress' },
  { id: 'sneakers', label: 'Sneakers', type: 'shoes' },
  { id: 'boots', label: 'Boots', type: 'shoes' },
  { id: 'heels', label: 'Heels', type: 'shoes' },
  { id: 'jacket-denim', label: 'Denim Jacket', type: 'outerwear' },
  { id: 'coat-long', label: 'Long Coat', type: 'outerwear' },
];

export const ACCESSORY_TYPES: CatalogOption<AccessoryType>[] = [
  { value: 'glasses', label: 'Glasses' },
  { value: 'sunglasses', label: 'Sunglasses' },
  { value: 'hat', label: 'Hat' },
  { value: 'headband', label: 'Headband' },
  { value: 'hairpin', label: 'Hairpin' },
  { value: 'scarf', label: 'Scarf' },
  { value: 'earrings', label: 'Earrings' },
  { value: 'necklace', label: 'Necklace' },
  { value: 'choker', label: 'Choker' },
  { value: 'rings', label: 'Rings' },
  { value: 'bracelets', label: 'Bracelets' },
  { value: 'watch', label: 'Watch' },
  { value: 'bag', label: 'Bag' },
  { value: 'belt', label: 'Belt' },
  { value: 'tattoo', label: 'Tattoo' },
  { value: 'pierce', label: 'Piercing' },
];

/** A broad, inclusive default skin-tone swatch set (12 stops across
 * the human range). The color picker still allows ANY custom hex, so
 * this list is a convenience starting palette, not a restriction. */
export const SKIN_TONE_SWATCHES: string[] = [
  '#ffe0bd', '#ffcd94', '#eac086', '#f8c5a0', '#e0ac69', '#c68642',
  '#a1665e', '#8d5524', '#7a4a2b', '#5a3825', '#4a2c1d', '#3b2219',
];

export const HAIR_COLOR_SWATCHES: string[] = [
  '#0a0a0a', '#2d2d2d', '#3b2219', '#6b4423', '#8b5a2b', '#a67c52',
  '#c9a15a', '#e8c27a', '#f2d9a0', '#e63946', '#7b2cbf', '#00b4d8',
  '#ffffff', '#c0c0c0', '#ff6b9d', '#2ec4b6',
];

export const EYE_COLOR_SWATCHES: string[] = [
  '#4a2c1d', '#6b4423', '#8b5a2b', '#2e5339', '#3a7ca5', '#6699cc',
  '#7b2cbf', '#c9a15a', '#1a1a1a', '#87ceeb',
];

/** Full-body preset "randomize" pools used by the Randomize button and
 * by the Quick-Start templates list. Each template is a complete,
 * ready-to-use starting character a user can pick then tweak. */
export const QUICK_START_TEMPLATE_IDS = [
  'default-balanced',
  'punk-edge',
  'soft-pastel',
  'business-formal',
  'streetwear',
  'fantasy-elf',
  'athletic-casual',
  'goth',
  'preppy',
  'cozy-cottagecore',
] as const;
