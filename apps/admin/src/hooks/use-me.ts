import { useQuery } from "@tanstack/react-query"
import { adminApi, getToken } from "@/lib/api"

/** The signed-in admin. Fails when there is no token or the API rejects it. */
export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      if (!getToken()) throw new Error("Not signed in")
      return (await adminApi.me()).admin
    },
    retry: false,
    staleTime: 5 * 60_000,
  })
