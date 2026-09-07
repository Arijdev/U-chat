import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wngcxtcufszlzpbtvauu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_77KN3HdnAnYBn-6_opGmEQ_OSiy3shM";

async function runTest() {
  console.log("=== STEP 1: TEST HOMEPAGE ===");
  try {
    const resHome = await fetch("http://localhost:3000/");
    console.log("Homepage status:", resHome.status);
    const htmlHome = await resHome.text();
    const hasArixo = htmlHome.includes("Arixo");
    console.log("Homepage has 'Arixo':", hasArixo);
  } catch (e) {
    console.error("Homepage fetch failed:", e.message);
  }

  console.log("\n=== STEP 2: TEST LOGIN PAGE ===");
  try {
    const resLogin = await fetch("http://localhost:3000/auth/login");
    console.log("Login page status:", resLogin.status);
    const htmlLogin = await resLogin.text();
    const hasWelcome = htmlLogin.includes("Welcome to Arixo Web");
    console.log("Login page has 'Welcome to Arixo Web':", hasWelcome);
  } catch (e) {
    console.error("Login page fetch failed:", e.message);
  }

  console.log("\n=== STEP 3: LOGIN WITH USER CREDENTIALS ===");
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const email = "arij.chowdhuryr@gmail.com";
  const password = "123456";

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase Login Error:", error.message);
    return;
  }

  console.log("Supabase login successful! User ID:", data.user.id);
  console.log("User Display Name:", data.user.user_metadata?.display_name);
  console.log("Raw avatar_url length in metadata:", data.user.user_metadata?.avatar_url?.length || 0);
  console.log("User Avatar URL starts with:", data.user.user_metadata?.avatar_url?.slice(0, 40));

  // Check if avatar_url is a bloated base64 data URL
  if (data.user.user_metadata?.avatar_url?.startsWith("data:")) {
    console.log("DETECTED: User metadata contains legacy bloated base64 photo! Sanitizing in Supabase Auth...");
    const cleanUrl = `/api/chat/avatar?userId=${data.user.id}`;
    const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
      data: {
        avatar_url: cleanUrl,
      },
    });
    if (updateErr) {
      console.error("Failed to sanitize metadata:", updateErr.message);
    } else {
      console.log("SUCCESSFULLY sanitized user avatar_url in Supabase Auth to:", cleanUrl);
    }
  } else {
    console.log("User avatar_url is already clean!");
  }

  console.log("\n=== STEP 4: TEST /chat ROUTE ===");
  try {
    const resChat = await fetch("http://localhost:3000/chat");
    console.log("Chat route status:", resChat.status);
    const htmlChat = await resChat.text();
    console.log("Chat route HTML length:", htmlChat.length);
    console.log("Chat route has 'Arixo':", htmlChat.includes("Arixo"));
  } catch (e) {
    console.error("Chat route fetch failed:", e.message);
  }

  console.log("\n=== STEP 5: TEST /api/chat/conversations ===");
  try {
    const resConvs = await fetch(`http://localhost:3000/api/chat/conversations?userId=${data.user.id}`);
    console.log("Conversations API status:", resConvs.status);
    const convs = await resConvs.json();
    console.log("Conversations count:", Array.isArray(convs) ? convs.length : convs);
  } catch (e) {
    console.error("Conversations API failed:", e.message);
  }

  console.log("\n=== ALL TEST STEPS FINISHED ===");
}

runTest();
