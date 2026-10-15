# High-DPI Crisp Canvas & Blurriness Elimination Plan

Mengatasi masalah tampilan game yang buram (*blurry*) dengan meningkatkan resolusi kanvas secara dinamis mengikuti *device pixel ratio* (DPR) layar pengguna, menerapkan *pixel-perfect integer/crisp scaling*, serta menyelaraskan koordinat *input pointer* dan *render loop*.

## User Review & Critical Decisions

> [!IMPORTANT]
> Keputusan teknis yang telah dikonfirmasi oleh pengguna:
> - **Metode Penajaman Visual**: *Pixel-perfect integer scaling with sharp nearest-neighbor edges* — menghilangkan efek blur akibat interpolasi bilinear peramban dengan menggunakan properti CSS `image-rendering: pixelated; image-rendering: crisp-edges;` serta rendering subpixel tajam.
> - **Resolusi Internal Kanvas**: *Dynamic device pixel ratio buffer matching viewport* — buffer kanvas (`canvas.width` dan `canvas.height`) dihitung dinamis dari ukuran kontainer fisik dikalikan `window.devicePixelRatio` (1x, 2x Retina, 3x mobile) sehingga setiap pixel fisik layar dirender dengan ketajaman kristal (1:1 pixel match).

- **Confirmed Decision 1**: Dunia simulasi game tetap mempertahankan koordinat virtual standar $1200 \times 700$ agar semua mekanik balistik, jangkauan tombak, hitboxes, dan unit test tetap stabil tanpa regresi.
- **Confirmed Decision 2**: Transformasi matriks kanvas (`ctx.setTransform`) secara otomatis menyesuaikan rasio skala DPR dan dimensi kontainer saat inisialisasi maupun saat jendela peramban diubah ukurannya (*resize*).
- **Confirmed Decision 3**: Konversi pointer (`screenToWorld`) diperbarui dengan sinkronisasi `getBoundingClientRect()` yang dinamis untuk menjamin keakuratan goresan garis pemain saat menggambar rute formasi taktis.

---

## 1. Overview & Core Concept

- **What It Does**: Mengganti resolusi statis $1200 \times 700$ yang terdistorsi saat di-stretch layar besar dengan sistem resolusi dinamis *High-DPI Retina Buffer*.
- **Target Audience / Persona**: Pemain di berbagai perangkat layar (layar Retina MacBook, monitor 1080p, 1440p, 4K, hingga layar ponsel High-DPI).
- **Key Value**: Mengeliminasi keburaman visual, teks pertarungan yang kabur, serta garis tebing dan unit yang pecah, menggantikannya dengan visual game taktis medieval yang tajam dan jernih.

---

## 2. Technical Architecture & Implementation Steps

```
┌─────────────────────────────────────────────────────────────────┐
│                     Viewport & ResizeObserver                   │
│                                                                 │
│  - Ukur rect kontainer kanvas (misal: 1440 x 840)               │
│  - Ambil window.devicePixelRatio (misal: 2x)                    │
│  - Set canvas.width  = rect.width * dpr (2880 px buffer)        │
│  - Set canvas.height = rect.height * dpr (1680 px buffer)       │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Canvas 2D Rendering Context                  │
│                                                                 │
│  - ctx.setTransform(scaleX * dpr, 0, 0, scaleY * dpr, 0, 0)     │
│  - CSS: image-rendering: pixelated / crisp-edges                │
│  - Semua kalkulasi logika tetap dalam ruang 1200 x 700          │
└────────────────────────────────┼────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Input & Line Drawing Mapping                 │
│                                                                 │
│  - screenToWorld(clientX, clientY):                             │
│      x = (clientX - rect.left) * (1200 / rect.width)            │
│      y = (clientY - rect.top)  * (700 / rect.height)            │
│  - Bebas latensi, akurasi sentuhan sempurna                     │
└─────────────────────────────────────────────────────────────────┘
```

### Rincian Perubahan File:

1. **`src/App.tsx`**:
   - Menambahkan fungsi `updateCanvasResolution()` yang membaca `canvas.getBoundingClientRect()` dan `window.devicePixelRatio`.
   - Mengalokasikan buffer `canvas.width` dan `canvas.height` beresolusi penuh sesuai ukuran layar fisik.
   - Memasang `ResizeObserver` pada elemen kontainer canvas untuk memastikan perubahan ukuran browser seketika memperbarui ketajaman gambar tanpa flicker.
   - Memperbarui gaya CSS `<canvas>` dengan class `image-crisp` / `[image-rendering:pixelated]`.

2. **`src/game/renderer.ts`**:
   - Memperbarui metode `resize()` dan `render()` untuk menerima matriks skala atau merender ruang $1200 \times 700$ dengan `ctx.save()` dan `ctx.restore()`.
   - Menetapkan konfigurasi `ctx.imageSmoothingEnabled = false` saat dalam mode pixelated untuk menghasilkan tepian garis miniatur dan tanah yang tajam.

3. **`src/index.css`**:
   - Menambahkan utilitas CSS global untuk `image-rendering: crisp-edges` dan `image-rendering: pixelated` guna kompatibilitas lintas peramban (Chrome, Safari, Firefox).

---

## 3. Verification & Testing Plan

1. **Retina & High-DPI Verification**:
   - Periksa rendering canvas pada mode browser standar maupun emulasi Retina 2x/3x.
   - Pastikan teks, sprite unit, kerikil jalan, dan dinding tebing tampak tajam tanpa bayangan kabur.
2. **Pointer Accuracy Verification**:
   - Uji penarikan garis taktis pada kanvas dengan pointer/mouse: verifikasi garis formasi berada tepat di bawah ujung kursor.
3. **Resize & Aspect Ratio Stability**:
   - Ubah ukuran jendela browser dan verifikasi kanvas menyesuaikan resolusinya secara otomatis tanpa distorsi rasio aspek.
4. **Compilation & Unit Tests**:
   - Jalankan `npm test` untuk memastikan seluruh 11 unit test tetap hijau.
   - Jalankan `lint_applet` dan `compile_applet`.
