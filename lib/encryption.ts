// Web Crypto API is available in all modern browsers

export async function encryptMessage(message: string, conversationId: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)

    // Generate a random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12))

    // Create a key from conversation ID (padded to 32 bytes for AES-256)
    const keyData = encoder.encode(conversationId.substring(0, 32).padEnd(32, "0"))
    const keyMaterial = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"])

    // Encrypt the message
    const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keyMaterial, data)

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength)
    combined.set(iv)
    combined.set(new Uint8Array(encrypted), iv.length)

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined))
  } catch (error) {
    console.error(" Encryption error:", error)
    return message // Fallback to plain text if encryption fails
  }
}

export async function decryptMessage(encryptedMessage: string, conversationId: string): Promise<string> {
  try {
    // Convert from base64
    const combined = Uint8Array.from(atob(encryptedMessage), (c) => c.charCodeAt(0))

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    // Create a key from conversation ID (same as encryption)
    const encoder = new TextEncoder()
    const keyData = encoder.encode(conversationId.substring(0, 32).padEnd(32, "0"))
    const keyMaterial = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"])

    // Decrypt the message
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, encrypted)

    // Convert back to string
    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (error) {
    console.error(" Decryption error:", error)
    return encryptedMessage // Return encrypted if decryption fails
  }
}
