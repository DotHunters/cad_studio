import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";

import { Accent, SectionHeading } from "./section-heading";
import { ShowreelPlayer } from "./showreel-player";

export async function Showreel() {
  const videoId = siteConfig.showreelYoutubeId;
  if (!videoId) return null;
  const t = await getTranslations("Home");

  return (
    <section
      aria-labelledby="showreel-title"
      className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 sm:pt-12 lg:pt-16"
    >
      <SectionHeading
        id="showreel-title"
        eyebrow={t("showreelEyebrow")}
        title={t.rich("showreelTitle", { accent: (chunks) => <Accent>{chunks}</Accent> })}
        intro={t("showreelIntro")}
      />
      <div className="mt-12">
        <ShowreelPlayer
          videoId={videoId}
          playLabel={t("showreelPlay")}
          videoTitle={t("showreelVideoTitle")}
          posterAlt={t("showreelPosterAlt")}
        />
      </div>
    </section>
  );
}
