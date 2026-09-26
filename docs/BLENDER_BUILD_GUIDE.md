# V-Me Apartment Blender Build Guide

**Purpose:** Generate production-ready 3D apartment geometry, LOD variants, and collision data from a deterministic Python script.

**Required:** Blender 4.0+ with Python 3.10+

---

## Overview

The Blender build pipeline converts the apartment specification (defined in TypeScript as `ApartmentDef`) into optimised GLB files:

- **`scene.glb`** — Full-detail mesh for high-tier devices
- **`scene.lod-low.glb`** — Merged furniture for low-tier devices  
- **`markers.json`** — Spawn and camera-stand points (sidecar, for easy runtime access)

The procedural **TypeScript fallback** (§19.10 in the spec) remains the source of truth for collision and marker data; the Blender output is a visual enhancement that does not change gameplay.

---

## Step-by-Step Setup & Build

### 1. **Install Blender (if not already installed)**

Download from [blender.org](https://www.blender.org/download/) — version 4.0 or later recommended.

**Verify installation:**
```bash
blender --version
```

### 2. **Export Apartment Data from TypeScript**

The Blender script reads from `apartment-data.json`, which is generated from the canonical TypeScript `ApartmentDef`.

```bash
cd /path/to/v-me-repo

# Generate apartment-data.json from TypeScript source
node scripts/export-apartment-data.mjs
```

**Expected output:**
```
✓ Exported apartment data to: tools/blender/apartment-data.json

Next step: Run the Blender script:
  blender --background --python tools/blender/build_apartment.py
```

If the command fails, verify:
- `ApartmentBuilder.createDefaultApartment()` is exported from `src/app/environment/apartment-builder.ts`
- Node.js is version 16+
- The TypeScript output includes all data structures (rooms, walls, furniture, lights, markers)

### 3. **Run the Blender Build Script**

```bash
blender --background --python tools/blender/build_apartment.py
```

**What happens:**
- Blender runs in headless mode (no UI)
- Reads `tools/blender/apartment-data.json`
- Builds all geometry (floors, walls, furniture, markers)
- Creates materials (flat-shaded, low-poly aesthetic)
- Exports full-detail mesh to `public/environments/apartment-default/scene.glb`
- Merges furniture and exports LOD variant to `scene.lod-low.glb`
- Writes marker sidecar JSON to `markers.json`

**Expected output:**
```
✓ Apartment build complete: public/environments/apartment-default
```

### 4. **Verify Output Files**

Check that all three files were created:

```bash
ls -lh public/environments/apartment-default/
```

Expected files:
- `scene.glb` (~500 KB–2 MB, depending on detail)
- `scene.lod-low.glb` (~300 KB–1 MB, merged)
- `markers.json` (~1 KB)

### 5. **Integrate into App**

At runtime, the app will:
1. **Check** if `public/environments/apartment-default/scene.glb` exists
2. **Load** it via `GLTFLoader` (§19.20.4 in spec)
3. **Fall back** to the procedural TypeScript builder if the GLB is missing

No additional code changes needed—the loader automatically detects which path to use.

---

## Troubleshooting

### **Script not found error**
```
FileNotFoundError: [Errno 2] No such file or directory: 'apartment-data.json'
```

**Fix:**  
Ensure you've run `node scripts/export-apartment-data.mjs` **before** running Blender.

### **Blender command not found**
```
command not found: blender
```

**Fix:**  
Add Blender to PATH, or use the full path:
```bash
/Applications/Blender.app/Contents/MacOS/blender --background --python tools/blender/build_apartment.py  # macOS
C:\Program Files\Blender Foundation\Blender 4.0\blender.exe --background --python tools/blender/build_apartment.py  # Windows
blender --background --python tools/blender/build_apartment.py  # Linux (if in PATH)
```

### **GLB file is huge (>10 MB)**
```
scene.glb is 50 MB — Draco compression failed?
```

**Fix:**  
Draco compression is enabled in the script. If it's not working, edit `build_apartment.py` line 208:
```python
# Change:
export_draco_mesh_compression_enable=True,
# To:
export_draco_mesh_compression_enable=False,  # disable if Draco causes issues
```

Then re-run the build.

### **Markers are missing or in wrong places**
The `markers.json` sidecar is generated from the TypeScript `ApartmentDef.markers` array. If markers don't match, check:
1. `apartment-data.json` contains all marker entries
2. Positions/lookAt values match the TypeScript source (§19.10.9 in spec)

### **Collision doesn't match visual geometry**

**Important:** The app uses the TypeScript procedural geometry for collision, not the Blender GLB. The GLB is visual only. If visual and collision don't match, the collision data (wall/furniture boxes in `ColliderBox` in the spec) is the source of truth, and the GLB should be adjusted to match it.

---

## When to Rebuild

Rebuild the Blender assets whenever:
- Furniture positions, sizes, or rotations change in the TypeScript spec
- Wall/room layout changes
- Material colors are updated
- Room/ceiling heights change
- Lighting setup is modified

**Do NOT rebuild** if:
- Only the app's UI, input controls, or camera logic changes
- Only the procedural TypeScript builder is being tested (the fallback always works)

---

## Optional: Hand-Sculpting on Top

The Blender script generates a clean, procedural base. After running it once, you can:

1. **Open the generated `.blend` file** in Blender's GUI:
   ```
   blender public/environments/apartment-default/scene.blend
   ```

2. **Hand-sculpt enhancements** (optional):
   - Add bevels to edges
   - Apply textures
   - Add trim/baseboards
   - Refine door/window geometry

3. **Keep object names intact** (e.g., `wall_`, `furn_`, `Marker_`) so collision logic still works

4. **Re-export** with the same script (it will overwrite the GLB)

---

## Reference

- **Spec section:** Environment Addendum §19.20
- **Source data:** `src/app/environment/apartment-builder.ts`
- **Blender version:** 4.0+
- **Target format:** glTF 2.0 (GLB binary)
- **Collision:** Handled by `PhysicsWorldService` (cannon-es), not Blender
- **Fallback:** App always works with procedural TypeScript geometry if no GLB is present

---

## Quick Reference: Full Build Pipeline

```bash
# 1. Export data from TypeScript
node scripts/export-apartment-data.mjs

# 2. Run Blender build
blender --background --python tools/blender/build_apartment.py

# 3. Verify output
ls public/environments/apartment-default/
  scene.glb           ✓
  scene.lod-low.glb   ✓
  markers.json        ✓

# 4. App automatically loads on next run
# (No code changes needed — loader detects GLB)
```

Done. The apartment is ready to ship.
