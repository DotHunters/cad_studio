import { redirect } from "next/navigation";

/** Moved to Admin → Services ("Change photo" on each row). */
export default function ServiceTilesMoved() {
  redirect("/admin/services");
}
