#!/usr/bin/env node
/**
 * V-Me Export Apartment Data
 * Exports the canonical TypeScript ApartmentDef to JSON for Blender.
 *
 * Run with:
 *   node scripts/export-apartment-data.mjs
 *
 * Outputs:
 *   tools/blender/apartment-data.json
 *
 * Ref: Environment Addendum §19.20.2
 */

import { ApartmentBuilder } from '../src/app/environment/apartment-builder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Create default apartment definition
  const apartmentDef = ApartmentBuilder.createDefaultApartment();

  // Serialize to JSON (ensure Vec3 format is preserved)
  const json = JSON.stringify(apartmentDef, null, 2);

  // Output path
  const outDir = path.join(__dirname, '..', 'tools', 'blender');
  const outPath = path.join(outDir, 'apartment-data.json');

  // Ensure directory exists
  fs.mkdirSync(outDir, { recursive: true });

  // Write file
  fs.writeFileSync(outPath, json, 'utf-8');

  console.log(`✓ Exported apartment data to: ${outPath}`);
  console.log(`\nNext step: Run the Blender script:`);
  console.log(`  blender --background --python tools/blender/build_apartment.py`);
}

main().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
