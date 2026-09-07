import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://wngcxtcufszlzpbtvauu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_77KN3HdnAnYBn-6_opGmEQ_OSiy3shM";

async function purgeBloatedAvatar() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
    },
  });

  const email = "arij.chowdhuryr@gmail.com";
  const password = "123456";

  console.log("Signing in to Supabase...");
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInErr) {
    console.error("Sign in failed:", signInErr);
    return;
  }

  console.log("Current user metadata avatar length:", signInData.user.user_metadata?.avatar_url?.length || 0);

  // Save the avatar image into server store / filesystem first so the photo is NOT lost!
  const rawBase64 = signInData.user.user_metadata?.avatar_url;
  if (rawBase64 && rawBase64.startsWith("data:")) {
    console.log("Saving existing photo to local avatar storage...");
    try {
      const saveRes = await fetch("http://localhost:3000/api/chat/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: signInData.user.id, dataUrl: rawBase64 }),
      });
      const saved = await saveRes.json();
      console.log("Saved photo to server avatar endpoint:", saved);
    } catch(e) {
      console.warn("Could not save to avatar endpoint:", e.message);
    }
  }

  // Now replace avatar_url in Supabase with clean URL (only 30 bytes!)
  const cleanUrl = `/api/chat/avatar?userId=${signInData.user.id}`;
  console.log("Updating Supabase user metadata with cleanUrl:", cleanUrl);

  const { data: updateData, error: updateErr } = await supabase.auth.updateUser({
    data: {
      avatar_url: cleanUrl,
    },
  });

  if (updateErr) {
    console.error("UpdateUser error:", updateErr);
  } else {
    console.log("SUCCESS! Updated user metadata in Supabase Auth.");
    console.log("New avatar_url length in Supabase:", updateData.user.user_metadata?.avatar_url?.length);
    console.log("New avatar_url value:", updateData.user.user_metadata?.avatar_url);
  }
}

purgeBloatedAvatar();
