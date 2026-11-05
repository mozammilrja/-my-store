import type { SeedContext } from "../api-server.ts"

/*
 * For the main admin suite (playwright.config.js), which seeds every area:
 * a storefront customer, registered through the real sign-up, so the
 * customers screen has someone to open. Not part of any one ops area.
 */
export async function seed({ api }: SeedContext) {
  await api("POST", "/store/auth/register", { email: "asha.rao@example.com", password: "asha-password-1", firstName: "Asha", lastName: "Rao", phone: "9886012345" }, {})
}
