import { createAreaApi } from "@/areas/shared/api"

/* Calls to /rider on the API with the portal session (see areas/shared/api.ts). */
export { ApiError, errorMessage } from "@/areas/shared/api"
export const api = createAreaApi("/rider")
