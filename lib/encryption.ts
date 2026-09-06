// Web Crypto API is available in all modern browsers and Node 18+

function bufferToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000 // 32KB chunks to prevent call stack overflow
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

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

    // Convert to base64 safely
    return bufferToBase64(combined)
  } catch (error) {
    console.error("Encryption error:", error)
    return message // Fallback to plain text if encryption fails
  }
}

export async function decryptMessage(encryptedMessage: string, conversationId: string): Promise<string> {
  try {
    // Convert from base64 safely
    const combined = base64ToBuffer(encryptedMessage)

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
    // If decryption fails (e.g. plain text message from earlier or system message), return original
    return encryptedMessage
  }
}
