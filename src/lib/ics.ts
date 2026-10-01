/**
 * Minimal iCalendar (RFC 5545) event for booking confirmation emails (AGENTS.md §8.3).
 * Times are written in UTC ("Z") so every calendar app shows the right local time.
 */
export type IcsEvent = {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  organizerName: string;
  organizerEmail: string;
  /** Timestamp of this version of the event (DTSTAMP). */
  now: Date;
  /** "CONFIRMED" once the deposit is received; "TENTATIVE" while pending. */
  status?: "TENTATIVE" | "CONFIRMED" | "CANCELLED";
  /** Increment when the event changes (reschedules). */
  sequence?: number;
};

/** 20270612T180000Z */
export function formatIcsDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Folds a content line to 75 octets (UTF-8), continuing with CRLF + space. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    // First line may hold 75 octets; continuation lines 74 (the leading space counts).
    const limit = parts.length === 0 ? 75 : 74;
    if (size + bytes > limit) {
      parts.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cad Studio//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDate(event.now)}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(event.end)}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    event.description && `DESCRIPTION:${escapeIcsText(event.description)}`,
    event.location && `LOCATION:${escapeIcsText(event.location)}`,
    event.url && `URL:${event.url}`,
    `ORGANIZER;CN=${escapeIcsText(event.organizerName)}:mailto:${event.organizerEmail}`,
    `STATUS:${event.status ?? "TENTATIVE"}`,
    `SEQUENCE:${event.sequence ?? 0}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((line): line is string => Boolean(line));
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
