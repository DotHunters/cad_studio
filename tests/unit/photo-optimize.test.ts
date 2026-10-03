import sharp from "sharp";
import { describe, expect, it } from "vitest";

import { optimizePhoto } from "@/server/photos/optimize";

const photo = (width: number, height: number, options: { orientation?: number } = {}) =>
  sharp({ create: { width, height, channels: 3, background: "#c79856" } })
    .jpeg()
    .withMetadata({
      orientation: options.orientation,
      exif: { IFD0: { Make: "TestCam", Copyright: "Studio" } },
    })
    .toBuffer();

describe("optimizePhoto", () => {
  it("converts to WebP and caps the longest edge at 2400 px", async () => {
    const result = await optimizePhoto(await photo(6000, 4000));
    expect(await sharp(result.webp).metadata()).toMatchObject({
      format: "webp",
      width: 2400,
      height: 1600,
    });
    expect([result.width, result.height]).toEqual([2400, 1600]);
    expect(result.blurDataUrl).toMatch(/^data:image\/webp;base64,/);
  });

  it("never enlarges small photos", async () => {
    const result = await optimizePhoto(await photo(800, 600));
    expect([result.width, result.height]).toEqual([800, 600]);
  });

  it("turns photos upright and drops camera metadata", async () => {
    // EXIF orientation 6 = taken rotated 90°: a 3000×2000 file shows as 2000×3000.
    const result = await optimizePhoto(await photo(3000, 2000, { orientation: 6 }));
    expect([result.width, result.height]).toEqual([1600, 2400]);
    const meta = await sharp(result.webp).metadata();
    expect(meta.exif).toBeUndefined();
    expect(meta.orientation).toBeUndefined();
  });

  it("is much smaller than the original", async () => {
    const original = await sharp({
      create: {
        width: 4000,
        height: 3000,
        channels: 3,
        background: "#808080",
        noise: { type: "gaussian", mean: 128, sigma: 30 },
      },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    const result = await optimizePhoto(original);
    expect(result.webp.length).toBeLessThan(original.length / 2);
  });
});
