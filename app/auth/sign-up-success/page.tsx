import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-primary/5 flex items-center justify-center p-4 relative text-foreground">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <Card className="border border-border bg-card/90 backdrop-blur-md shadow-2xl rounded-2xl">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center shadow-xs">
                <CheckCircle className="w-8 h-8" />
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight text-foreground">Account Created!</CardTitle>
              <CardDescription className="text-muted-foreground">Check your email to confirm your account</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We&apos;ve sent a confirmation email to your inbox. Click the verification link in the email to activate your account and start chatting.
            </p>
            <Link href="/auth/login" className="block pt-2">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs font-medium">
                Proceed to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
