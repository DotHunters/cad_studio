import { redirect } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

/** Moved to Admin → Services → Change photo. */
export default async function ServiceTileMoved({ params }: Props) {
  redirect(`/admin/services/${encodeURIComponent((await params).slug)}/photo`);
}
