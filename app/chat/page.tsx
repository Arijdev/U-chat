import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ChatLayout from "@/components/chat/chat-layout"

export default async function ChatPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return <ChatLayout user={user} />
}
