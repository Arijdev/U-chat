import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MessageCircle, Users, Share2, Lock } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="border-b border-blue-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">A Chat</h1>
          </div>
          <Link href="/auth/login">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">Login</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-5xl font-bold text-gray-900 leading-tight">Connect with Anyone, Anywhere</h2>
            <p className="text-xl text-gray-600">
              A Chat is a modern messaging platform that lets you stay connected with friends and family through text,
              voice, video, and more.
            </p>
            <div className="flex gap-4">
              <Link href="/auth/sign-up">
                <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Get Started
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid gap-4">
            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Instant Messaging</h3>
                  <p className="text-sm text-gray-600">Send messages instantly to anyone</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Video & Voice Calls</h3>
                  <p className="text-sm text-gray-600">Crystal clear calls with screen sharing</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Share2 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Share Stories</h3>
                  <p className="text-sm text-gray-600">Share moments that disappear in 24 hours</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Lock className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">End-to-End Encrypted</h3>
                  <p className="text-sm text-gray-600">Your privacy is our priority</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl font-bold text-blue-600 mb-2">100M+</div>
            <p className="text-gray-600">Active Users</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-indigo-600 mb-2">24/7</div>
            <p className="text-gray-600">Support Available</p>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">150+</div>
            <p className="text-gray-600">Countries</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-blue-200 bg-white/50 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-gray-600">
          <p>&copy; 2025 A Chat. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
