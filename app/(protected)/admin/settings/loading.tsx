import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function SettingsLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
        <CardContent className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-9 w-36" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><Skeleton className="h-5 w-24" /></CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
