import { Cormorant_Garamond, Inter } from "next/font/google";

// Google's "latin" subset already covers French (é, è, à, ç, œ, «»…), so latin-ext would only
// add font files to download (performance, task 8.4).
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Headings use regular, medium and semibold; italic is the gold accent word.
export const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});
