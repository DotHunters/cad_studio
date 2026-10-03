/** Password rules shared by the browser forms and the server (no Node imports). */
import * as z from "zod";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

/** Not trimmed: spaces are allowed and count. */
export const passwordSchema = z
  .string("Required.")
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters.`);
