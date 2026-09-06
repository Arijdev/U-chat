import Link from "next/link"
import { MessageSquare, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-500">
          <MessageSquare className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
            404
          </h1>
          <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
          <p className="text-sm text-gray-400 max-w-xs mx-auto">
            The conversation or page you are looking for does not exist or may have been moved.
          </p>
        </div>
        <div>
          <Button
            asChild
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-xl inline-flex items-center gap-2"
          >
            <Link href="/chat">
              <ArrowLeft className="w-4 h-4" />
              Back to Chat
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
