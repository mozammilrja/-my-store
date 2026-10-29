import { useQuery } from "@tanstack/react-query"
import { sdk } from "@/lib/sdk"

export const useMe = () =>
  useQuery({
    queryKey: ["me"],
    queryFn: () => sdk.admin.user.me(),
    retry: false,
    staleTime: 5 * 60_000,
  })
