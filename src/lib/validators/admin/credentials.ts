import * as z from "zod";

/** Admin email and password: the sign-in form and the package import API. */
export const adminCredentialsSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(1).max(128),
});
