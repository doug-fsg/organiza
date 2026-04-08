import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function KanbanBoardLoading() {
  return (
    <div className="space-y-6">
      <div className="h-10 animate-pulse rounded-lg bg-muted/50 p-1" />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center px-6 py-0.5">
            <div className="flex w-full items-center space-x-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center px-6 py-0.5">
            <div className="flex w-full items-center space-x-2">
              <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-6 w-12 animate-pulse rounded bg-muted" />
                <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-5 gap-4 border-b pb-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-muted" />
              ))}
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="grid grid-cols-5 gap-4 py-3">
                {[1, 2, 3, 4, 5].map((j) => (
                  <div key={j} className="h-4 animate-pulse rounded bg-muted/50" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
