import { useQuery } from "@tanstack/react-query"
import { adminApi } from "@/lib/api"

/**
 * The operational snapshot the API computes for us: what is waiting to ship or
 * be collected, and which variants have run low. Feeds the nav counters and the
 * dashboard's exception queue, so it is fetched once and shared.
 */
export const useOperations = () =>
  useQuery({
    queryKey: ["operations"],
    queryFn: adminApi.dashboard,
    staleTime: 60_000,
  })
