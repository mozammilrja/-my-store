import { Navigate, Outlet, useLocation } from "react-router-dom"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/hooks/use-me"

export const RequireAuth = () => {
  const location = useLocation()
  const { isPending, isError } = useMe()

  if (isPending) {
    return (
      <div className="flex min-h-svh">
        <Skeleton className="hidden w-64 rounded-none md:block" />
        <div className="flex flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (isError) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
