import { Accent } from "@/components/site/section-heading";

/** The season's service name with its last word in the gold italic accent. */
export function SeasonalTitle({ name }: { name: string }) {
  const split = name.lastIndexOf(" ");
  if (split < 0) return <Accent>{name}</Accent>;
  return (
    <>
      {name.slice(0, split + 1)}
      <Accent>{name.slice(split + 1)}</Accent>
    </>
  );
}
