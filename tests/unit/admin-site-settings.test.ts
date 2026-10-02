import { describe, expect, it } from "vitest";

import {
  isPlaceholderText,
  SITE_SETTING_DEFINITIONS,
  siteSettingDefaults,
  siteSettingErrors,
  siteSettingsFormSchema,
} from "@/lib/admin/site-settings";
import { siteSettings as seeded } from "../../prisma/seed-data";

const valid = {
  CANCELLATION_POLICY: { en: "Full refund up to 30 days before.", fr: "Remboursement complet." },
  PAYMENT_INSTRUCTIONS: { en: "Interac e-Transfer to …", fr: "Virement Interac à …" },
};

describe("site settings", () => {
  it("cover every seeded setting", () => {
    const keys = SITE_SETTING_DEFINITIONS.map((definition) => definition.key);
    expect(keys.sort()).toEqual(Object.keys(seeded).sort());
  });

  it("start empty when missing or malformed", () => {
    expect(siteSettingDefaults([{ key: "CANCELLATION_POLICY", value: "oops" }])).toEqual({
      CANCELLATION_POLICY: { en: "", fr: "" },
      PAYMENT_INSTRUCTIONS: { en: "", fr: "" },
    });
  });

  it("trims and accepts both languages", () => {
    expect(
      siteSettingsFormSchema.parse({
        ...valid,
        CANCELLATION_POLICY: { en: "  Policy  ", fr: " Politique " },
      }).CANCELLATION_POLICY,
    ).toEqual({ en: "Policy", fr: "Politique" });
  });

  it("requires English and French", () => {
    expect(
      siteSettingErrors({ ...valid, PAYMENT_INSTRUCTIONS: { en: "Bank details", fr: " " } }),
    ).toEqual({ "PAYMENT_INSTRUCTIONS.fr": "Required." });
    expect(siteSettingErrors(valid)).toBeNull();
  });

  it("recognizes placeholder text", () => {
    expect(isPlaceholderText(seeded.PAYMENT_INSTRUCTIONS.en)).toBe(true);
    expect(isPlaceholderText("Interac e-Transfer")).toBe(false);
  });
});
