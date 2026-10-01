import { serializeJsonLd } from "@/lib/seo/json-ld";

type Props = { data: Parameters<typeof serializeJsonLd>[0] };

/** Renders schema.org structured data. Input is escaped by serializeJsonLd. */
export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
