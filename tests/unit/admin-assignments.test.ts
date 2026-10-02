import { describe, expect, it } from "vitest";

import { sameDayClashes, staffingNote } from "@/lib/admin/assignments";

describe("staffingNote", () => {
  it.each([
    [0, 1, "1 more photographer needed"],
    [0, 2, "2 more photographers needed"],
    [3, 2, "1 more than the 2 booked"],
    [2, 2, null],
  ])("%i assigned of %i booked → %s", (assigned, booked, note) => {
    expect(staffingNote(assigned, booked)).toBe(note);
  });
});

describe("sameDayClashes", () => {
  const sameDay = [
    { reference: "CAD-B-2027-0001", assigneeIds: ["alex", "sam"] },
    { reference: "CAD-B-2027-0002", assigneeIds: ["sam"] },
  ];

  it("lists the other bookings a person already covers that day", () => {
    expect(sameDayClashes("sam", sameDay)).toEqual(["CAD-B-2027-0001", "CAD-B-2027-0002"]);
    expect(sameDayClashes("alex", sameDay)).toEqual(["CAD-B-2027-0001"]);
    expect(sameDayClashes("jo", sameDay)).toEqual([]);
  });
});
