export default function ChatLoading() {
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="w-80 sm:w-96 border-r border-gray-800 flex flex-col p-4 space-y-4 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-800"></div>
            <div className="space-y-1.5">
              <div className="h-4 w-24 bg-gray-800 rounded"></div>
              <div className="h-3 w-16 bg-gray-800/70 rounded"></div>
            </div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gray-800"></div>
        </div>

        {/* Search Bar Skeleton */}
        <div className="h-10 w-full bg-gray-900 rounded-xl border border-gray-800"></div>

        {/* Story row Skeleton */}
        <div className="flex gap-2 overflow-hidden py-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-14 h-14 rounded-full bg-gray-800 border-2 border-gray-700"></div>
              <div className="h-2 w-10 bg-gray-800 rounded"></div>
            </div>
          ))}
        </div>

        {/* Conversation List Skeleton */}
        <div className="flex-1 space-y-3 pt-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-900/40 border border-gray-800/50">
              <div className="w-12 h-12 rounded-full bg-gray-800 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 w-28 bg-gray-800 rounded"></div>
                  <div className="h-3 w-10 bg-gray-800/70 rounded"></div>
                </div>
                <div className="h-3 w-40 bg-gray-800/60 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area Skeleton */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-950/60">
        <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-blue-500/20"></div>
        </div>
        <div className="h-5 w-48 bg-gray-800 rounded mb-2 animate-pulse"></div>
        <div className="h-3.5 w-64 bg-gray-800/60 rounded animate-pulse"></div>
      </div>
    </div>
  )
}
