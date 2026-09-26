/**
 * V-Me 2D Character System — Data Models
 * Complete type definitions for 2D character creation, storage, and rendering
 */

// ─────────────────────────────────────────────────────────────────
// Base Character Model
// ─────────────────────────────────────────────────────────────────

export interface Character2D {
  id: string;
  name: string;
  version: number;

  // Core appearance layers
  base: BaseLayer;
  features: FaceFeatures;
  hair: HairLayer;
  outfit: OutfitLayers[];
  accessories: Accessory[];

  // Animation configuration
  animationStyle: AnimationStyle;

  // Metadata
  tags: string[];
  color: { primary: string; accent: string };
  created: number;
  modified: number;
}

// ─────────────────────────────────────────────────────────────────
// Base Body Layer
// ─────────────────────────────────────────────────────────────────

export interface BaseLayer {
  bodyShape: BodyShape;
  skinTone: string; // hex color
  height: number; // relative scale 0.8-1.5
  shoulderWidth: number; // 0.7-1.3
  waistNarrowness: number; // 0.6-1.2
  limbLength: number; // 0.8-1.2
}

export type BodyShape = 'petite' | 'slim' | 'athletic' | 'curvy' | 'muscular' | 'androgynous' | 'custom';

// ─────────────────────────────────────────────────────────────────
// Facial Features (Comprehensive)
// ─────────────────────────────────────────────────────────────────

export interface FaceFeatures {
  faceShape: FaceShape;
  skinDetails: SkinDetails;
  eyes: EyeFeatures;
  nose: NoseFeatures;
  mouth: MouthFeatures;
  brows: BrowFeatures;
  cheekbones: CheekboneFeatures;
  chin: ChinFeatures;
  ears: EarFeatures;
}

export type FaceShape = 'round' | 'oval' | 'square' | 'heart' | 'oblong' | 'diamond' | 'triangle';

export interface SkinDetails {
  texture: 'smooth' | 'freckles' | 'acne' | 'scars' | 'mixed';
  freckles?: {
    count: number;
    color: string;
    density: number; // 0-1
  };
  scars?: ScarMark[];
  birthmarks?: BirthmarkMark[];
  makeup?: MakeupLayer;
}

export interface ScarMark {
  id: string;
  position: { x: number; y: number }; // normalized 0-1
  size: number;
  angle: number;
  color: string;
}

export interface BirthmarkMark {
  id: string;
  position: { x: number; y: number };
  size: number;
  color: string;
  shape: 'round' | 'oval' | 'irregular';
}

export interface MakeupLayer {
  eyeshadow?: {
    color: string;
    intensity: number;
    style: 'natural' | 'smokey' | 'glitter' | 'metallic';
  };
  blush?: {
    color: string;
    intensity: number;
    style: 'natural' | 'bold' | 'gradient';
  };
  eyeliner?: {
    color: string;
    thickness: number;
    style: 'natural' | 'winged' | 'thick' | 'graphic';
  };
  lipstick?: {
    color: string;
    finish: 'matte' | 'satin' | 'glossy' | 'metallic';
  };
}

export interface EyeFeatures {
  shape: EyeShape;
  colorPrimary: string;
  colorSecondary?: string; // Gradient or ring
  size: number; // 0.7-1.5
  distance: number; // 0.8-1.3 (eye spacing)
  tilt: number; // angle in degrees -30 to 30
  iris: {
    innerColor: string;
    outerColor?: string;
    hasShine: boolean;
    shinePosition: number; // 0-1
    shineSize: number; // 0.1-0.5
  };
  eyebags?: {
    color: string;
    intensity: number;
  };
}

export type EyeShape = 'round' | 'almond' | 'hooded' | 'upturned' | 'downturned' | 'monolid' | 'cat-eye';

export interface NoseFeatures {
  shape: NoseShape;
  width: number; // 0.6-1.4
  length: number; // 0.7-1.3
  tilt: number; // -1 to 1 (nostril position)
  nostrilShape: 'round' | 'oval' | 'teardrop';
  bridge: 'thin' | 'medium' | 'wide' | 'bumpy';
  tipRotation: number; // -30 to 30
}

export type NoseShape = 'button' | 'bulbous' | 'pointed' | 'crooked' | 'upturned' | 'downturned' | 'snub';

export interface MouthFeatures {
  shape: MouthShape;
  width: number; // 0.7-1.3
  height: number; // 0.8-1.2
  lipFullness: 'thin' | 'medium' | 'full' | 'very-full';
  upperLipSize: number;
  lowerLipSize: number;
  cornerTilt: number; // smile angle
  color: string;
  gloss: boolean;
  texture: 'matte' | 'satin' | 'glossy' | 'metallic';
}

export type MouthShape = 'full' | 'thin' | 'heart-shaped' | 'uneven' | 'wide' | 'small';

export interface BrowFeatures {
  shape: BrowShape;
  color: string;
  thickness: number; // 0.5-2.0
  length: number; // 0.7-1.3
  density: number; // 0.5-1.0 (how filled in)
  distance: number; // spacing from eyes
  tilt: number; // angle
}

export type BrowShape = 'straight' | 'arched' | 'upturned' | 'downturned' | 'angled' | 'soft';

export interface CheekboneFeatures {
  height: number; // 0.6-1.4
  width: number; // 0.7-1.3
  prominence: 'subtle' | 'moderate' | 'prominent';
  color?: string; // Optional blush tone
}

export interface ChinFeatures {
  shape: ChinShape;
  width: number; // 0.8-1.2
  length: number; // 0.8-1.2
  cleft: boolean;
  dimple: boolean;
}

export type ChinShape = 'pointed' | 'rounded' | 'square' | 'prominent' | 'receding' | 'soft';

export interface EarFeatures {
  shape: EarShape;
  size: number; // 0.7-1.3
  position: number; // how high on head, 0-1
  lobeSize: number; // 0.7-1.3
  lobeAttachment: 'attached' | 'unattached';
}

export type EarShape = 'elf' | 'round' | 'pointed' | 'square' | 'prominent' | 'flat';

// ─────────────────────────────────────────────────────────────────
// Hair Layer
// ─────────────────────────────────────────────────────────────────

export interface HairLayer {
  styleId: string; // References hair style from asset library
  color: string;
  underColor?: string; // Two-tone hair
  length: HairLength;
  texture: HairTexture;
  bangs: BangsStyle;
  volume: number; // 0.5-1.5
  shine: number; // 0-1
  customization?: HairCustom;
}

export type HairLength = 'buzzcut' | 'short' | 'medium' | 'long' | 'waist' | 'floor';
export type HairTexture = 'straight' | 'wavy' | 'curly' | 'coily' | 'afro' | 'braided' | 'zigzag';
export type BangsStyle = 'none' | 'straight' | 'side-swept' | 'wispy' | 'blunt' | 'curtain' | 'shaggy';

export interface HairCustom {
  colorGradient?: { startColor: string; endColor: string; angle: number };
  highlights?: { color: string; intensity: number; pattern: string };
  streaks?: { color: string; count: number; width: number };
  accessories?: string[]; // Hair clips, ribbons, etc.
}

// ─────────────────────────────────────────────────────────────────
// Outfit Layers
// ─────────────────────────────────────────────────────────────────

export interface OutfitLayers {
  id: string;
  type: OutfitType;
  styleId: string; // References asset library
  colors: {
    primary: string;
    secondary?: string;
    tertiary?: string;
  };
  pattern?: PatternDefinition;
  fit: FitType;
  sleeves?: SleeveType;
  length?: LengthType;
  neckline?: NecklineType;
}

export type OutfitType = 'top' | 'bottom' | 'dress' | 'shoes' | 'outerwear' | 'accessory-worn';

export type FitType = 'tight' | 'fitted' | 'loose' | 'oversized' | 'bodycon';
export type SleeveType = 'sleeveless' | 'short' | 'three-quarter' | 'long' | 'bell' | 'puffed';
export type LengthType = 'crop' | 'standard' | 'long' | 'maxi';
export type NecklineType = 'crew' | 'v-neck' | 'off-shoulder' | 'halter' | 'boat' | 'turtleneck' | 'sweetheart';

export interface PatternDefinition {
  type: string; // 'solid' | 'stripes' | 'plaid' | 'floral' | 'geometric' | etc
  color: string;
  scale: number;
  opacity: number;
}

// ─────────────────────────────────────────────────────────────────
// Accessories
// ─────────────────────────────────────────────────────────────────

export interface Accessory {
  id: string;
  type: AccessoryType;
  styleId: string;
  color: string;
  position: AccessoryPosition;
  scale: number;
  rotation: number;
}

export type AccessoryType =
  | 'glasses'
  | 'sunglasses'
  | 'hat'
  | 'headband'
  | 'hairpin'
  | 'scarf'
  | 'earrings'
  | 'necklace'
  | 'choker'
  | 'rings'
  | 'bracelets'
  | 'watch'
  | 'bag'
  | 'belt'
  | 'tattoo'
  | 'pierce';

export interface AccessoryPosition {
  x: number; // -1 to 1 (left to right)
  y: number; // -1 to 1 (top to bottom)
  attachPoint: 'head' | 'neck' | 'wrist' | 'finger' | 'torso' | 'hip';
}

// ─────────────────────────────────────────────────────────────────
// Animation Configuration
// ─────────────────────────────────────────────────────────────────

export interface AnimationStyle {
  expressiveness: Expressiveness;
  posture: PostureType;
  blink: BlinkConfig;
  idle: IdleAnimation;
  customPoses?: PosePreset[];
}

export type Expressiveness = 'subtle' | 'moderate' | 'expressive' | 'exaggerated' | 'deadpan';
export type PostureType = 'slouch' | 'neutral' | 'upright' | 'confident' | 'hunched';

export interface BlinkConfig {
  frequency: number; // times per minute
  duration: number; // ms
  style: 'normal' | 'slow' | 'flutter' | 'heavy' | 'tired';
}

export type IdleAnimation = 'static' | 'breathing' | 'fidget' | 'sway' | 'bounce';

export interface PosePreset {
  id: string;
  name: string;
  skeletonData: SkeletalTransform[];
  expressionData?: any;
}

// ─────────────────────────────────────────────────────────────────
// Animation & Rendering
// ─────────────────────────────────────────────────────────────────

export interface BodyTransforms {
  head: Transform2D;
  torso: Transform2D;
  leftArm: Transform2D;
  rightArm: Transform2D;
  leftLeg: Transform2D;
  rightLeg: Transform2D;
  leftHand: Transform2D;
  rightHand: Transform2D;
  neck: Transform2D;
}

export interface Transform2D {
  position: { x: number; y: number };
  rotation: number; // radians
  scale: number;
  skewX?: number;
  skewY?: number;
}

export interface SkeletalTransform {
  bone: string;
  transform: Transform2D;
}

export interface FacialExpressions {
  browHeight: { left: number; right: number }; // 0-1
  eyeOpeness: { left: number; right: number };
  eyeDirection: { x: number; y: number }; // -1 to 1
  mouthOpenness: number; // 0-1
  mouthWidth: number; // 0-1
  cheekPuff: number; // 0-1
  jawClench: number; // 0-1
  noseWrinkle: number; // 0-1
  tongueOut: number; // 0-1
  smile: number; // 0-1
  frown: number; // 0-1
  surprise: number; // 0-1
  angry: number; // 0-1
  sadness: number; // 0-1
  disgust: number; // 0-1
  fear: number; // 0-1
}

export interface AnimationFrame {
  bodyTransforms: BodyTransforms;
  expressions: FacialExpressions;
  timestamp: number;
}

// ─────────────────────────────────────────────────────────────────
// Asset Definitions
// ─────────────────────────────────────────────────────────────────

export interface AssetDefinition {
  id: string;
  name: string;
  category: AssetCategory;
  svgSource?: string; // SVG path or data
  svgPath?: string; // Path to SVG file
  colorTemplate?: boolean; // Can be colorized
  layers?: string[]; // For layered assets
  metadata?: {
    author?: string;
    license?: string;
    tags?: string[];
  };
}

export type AssetCategory =
  | 'body'
  | 'hair'
  | 'hairstyle'
  | 'top'
  | 'bottom'
  | 'dress'
  | 'shoes'
  | 'outerwear'
  | 'accessory'
  | 'glasses'
  | 'hat';

// ─────────────────────────────────────────────────────────────────
// Presets & Templates
// ─────────────────────────────────────────────────────────────────

export interface CharacterPreset {
  id: string;
  name: string;
  description: string;
  category: string; // 'anime' | 'realistic' | 'cartoon' | 'fantasy' | etc
  character: Character2D;
  thumbnail: string; // data URL
}

// ─────────────────────────────────────────────────────────────────
// Storage & Export
// ─────────────────────────────────────────────────────────────────

export interface StoredCharacter2D {
  id: string;
  character: Character2D;
  thumbnail: string; // PNG data URL
  exported: number;
  synced: boolean;
}

export interface CharacterExport {
  version: number;
  character: Character2D;
  exportedAt: number;
  exportedBy: string;
  hash: string; // For integrity check
}

// Default/Empty Character
export function createDefaultCharacter(): Character2D {
  return {
    id: Math.random().toString(36).substr(2, 9),
    name: 'New Character',
    version: 1,
    base: {
      bodyShape: 'slim',
      skinTone: '#f8c5a0',
      height: 1.0,
      shoulderWidth: 1.0,
      waistNarrowness: 1.0,
      limbLength: 1.0,
    },
    features: {
      faceShape: 'oval',
      skinDetails: {
        texture: 'smooth',
      },
      eyes: {
        shape: 'almond',
        colorPrimary: '#6b4423',
        size: 1.0,
        distance: 1.0,
        tilt: 0,
        iris: {
          innerColor: '#1a1a1a',
          hasShine: true,
          shinePosition: 0.3,
          shineSize: 0.2,
        },
      },
      nose: {
        shape: 'button',
        width: 1.0,
        length: 1.0,
        tilt: 0,
        nostrilShape: 'oval',
        bridge: 'medium',
        tipRotation: 0,
      },
      mouth: {
        shape: 'full',
        width: 1.0,
        height: 1.0,
        lipFullness: 'medium',
        upperLipSize: 1.0,
        lowerLipSize: 1.0,
        cornerTilt: 0,
        color: '#d97a6a',
        gloss: false,
        texture: 'matte',
      },
      brows: {
        shape: 'arched',
        color: '#8b6f47',
        thickness: 1.0,
        length: 1.0,
        density: 0.8,
        distance: 1.0,
        tilt: 15,
      },
      cheekbones: {
        height: 1.0,
        width: 1.0,
        prominence: 'moderate',
      },
      chin: {
        shape: 'rounded',
        width: 1.0,
        length: 1.0,
        cleft: false,
        dimple: false,
      },
      ears: {
        shape: 'round',
        size: 1.0,
        position: 0.5,
        lobeSize: 1.0,
        lobeAttachment: 'attached',
      },
    },
    hair: {
      styleId: 'long-straight',
      color: '#2d2d2d',
      length: 'long',
      texture: 'straight',
      bangs: 'side-swept',
      volume: 1.0,
      shine: 0.7,
    },
    outfit: [
      {
        id: '1',
        type: 'top',
        styleId: 'casual-tshirt',
        colors: { primary: '#ffffff' },
        fit: 'fitted',
      },
      {
        id: '2',
        type: 'bottom',
        styleId: 'casual-jeans',
        colors: { primary: '#2b3e8f' },
        fit: 'fitted',
      },
    ],
    accessories: [],
    animationStyle: {
      expressiveness: 'moderate',
      posture: 'neutral',
      blink: {
        frequency: 17,
        duration: 100,
        style: 'normal',
      },
      idle: 'breathing',
    },
    tags: ['default'],
    color: { primary: '#f8c5a0', accent: '#6b4423' },
    created: Date.now(),
    modified: Date.now(),
  };
}
