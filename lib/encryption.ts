// Web Crypto API helper with SSR and environment safety

const getCrypto = () => {
  if (typeof globalThis !== "undefined" && globalThis.crypto) return globalThis.crypto
  if (typeof window !== "undefined" && window.crypto) return window.crypto
  return null
}

function bufferToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64")
  }
  let binary = ""
  const chunkSize = 0x8000 // 32KB chunks
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...Array.from(chunk))
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"))
  }
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

async function deriveKey(conversationId: string, cryptoObj: Crypto, usages: KeyUsage[]): Promise<CryptoKey> {
  const encoder = new TextEncoder()
  // Generate a guaranteed 256-bit key using SHA-256 digest of conversationId
  const keyBuffer = await cryptoObj.subtle.digest("SHA-256", encoder.encode(conversationId))
  return cryptoObj.subtle.importKey("raw", keyBuffer, { name: "AES-GCM" }, false, usages)
}

export async function encryptMessage(message: string, conversationId: string): Promise<string> {
  if (!message || typeof message !== "string") return message
  const cryptoObj = getCrypto()
  if (!cryptoObj?.subtle) {
    return message
  }

  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)

    // Generate a random IV (Initialization Vector, 12 bytes standard for AES-GCM)
    const iv = cryptoObj.getRandomValues(new Uint8Array(12))

    // Derive 256-bit key from conversation ID
    const keyMaterial = await deriveKey(conversationId, cryptoObj, ["encrypt"])

    // Encrypt the message
    const encrypted = await cryptoObj.subtle.encrypt({ name: "AES-GCM", iv }, keyMaterial, data)

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
  if (!encryptedMessage || typeof encryptedMessage !== "string") {
    return encryptedMessage || ""
  }
  const cryptoObj = getCrypto()
  if (!cryptoObj?.subtle) {
    return encryptedMessage
  }

  try {
    // Basic format check: base64 characters only
    if (!/^[A-Za-z0-9+/=]+$/.test(encryptedMessage.trim())) {
      return encryptedMessage
    }

    // Convert from base64 safely
    const combined = base64ToBuffer(encryptedMessage.trim())

    // AES-GCM combined must be at least 12 bytes IV + 16 bytes auth tag = 28 bytes
    if (combined.length < 28) {
      return encryptedMessage
    }

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12)
    const encrypted = combined.slice(12)

    // Try primary key derivation (SHA-256)
    try {
      const keyMaterial = await deriveKey(conversationId, cryptoObj, ["decrypt"])
      const decrypted = await cryptoObj.subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, encrypted)
      return new TextDecoder().decode(decrypted)
    } catch (e) {
      // Backward compatibility fallback: try legacy padded string key
      try {
        const encoder = new TextEncoder()
        const legacyKeyData = encoder.encode(conversationId.substring(0, 32).padEnd(32, "0"))
        const legacyKey = await cryptoObj.subtle.importKey("raw", legacyKeyData, { name: "AES-GCM" }, false, ["decrypt"])
        const decrypted = await cryptoObj.subtle.decrypt({ name: "AES-GCM", iv }, legacyKey, encrypted)
        return new TextDecoder().decode(decrypted)
      } catch (err2) {
        return encryptedMessage
      }
    }
  } catch (error) {
    // If decryption fails (e.g. plain text message from earlier), return original
    return encryptedMessage
  }
}
