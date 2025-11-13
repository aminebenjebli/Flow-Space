export default function Loading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <div className="h-9 bg-muted rounded w-48 mb-2"></div>
              <div className="h-5 bg-muted rounded w-64"></div>
            </div>
            <div className="h-10 bg-muted rounded w-40"></div>
          </div>

          {/* Search bar skeleton */}
          <div className="h-12 bg-muted rounded"></div>

          {/* Tabs skeleton */}
          <div className="border-b border-border mb-8">
            <div className="flex space-x-8">
              <div className="h-8 bg-muted rounded w-32"></div>
              <div className="h-8 bg-muted rounded w-32"></div>
            </div>
          </div>

          {/* Projects grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flow-card p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 bg-muted rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-6 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                <div className="flex justify-between pt-4 border-t border-border">
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
