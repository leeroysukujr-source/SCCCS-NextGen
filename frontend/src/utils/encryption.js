/**
 * Frontend encryption utilities using Web Crypto API
 * For end-to-end encryption of messages
 */

// Use Web Crypto API for encryption (browser-native, secure)
export class EncryptionUtil {
  constructor() {
    this.algorithm = 'AES-GCM'
    this.keyLength = 256
  }

  // Convert base64 string to ArrayBuffer
  async base64ToArrayBuffer(base64) {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    return bytes.buffer
  }

  // Convert ArrayBuffer to base64 string
  async arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  // Import key from base64 string
  async importKey(keyBase64) {
    try {
      const keyData = await this.base64ToArrayBuffer(keyBase64)
      return await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: this.algorithm },
        false,
        ['encrypt', 'decrypt']
      )
    } catch (error) {
      console.error('Error importing key:', error)
      throw error
    }
  }

  // Encrypt message
  async encryptMessage(message, keyBase64) {
    try {
      if (!message || !keyBase64) return message

      // Validate and clean the key
      let cleanKey = keyBase64
      // Remove whitespace and newlines
      cleanKey = cleanKey.trim().replace(/\s/g, '')
      // If key is not base64, try to handle it
      if (typeof cleanKey !== 'string' || cleanKey.length === 0) {
        console.warn('Invalid encryption key format, skipping encryption')
        return message
      }

      // Validate base64 format
      try {
        // Try to decode to validate
        atob(cleanKey)
      } catch (e) {
        console.warn('Encryption key is not valid base64, skipping encryption:', e)
        return message
      }

      const key = await this.importKey(cleanKey)
      const encoder = new TextEncoder()
      const data = encoder.encode(message)

      const iv = crypto.getRandomValues(new Uint8Array(12))
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv, 0)
      combined.set(new Uint8Array(encrypted), iv.length)

      return await this.arrayBufferToBase64(combined.buffer)
    } catch (error) {
      console.error('Encryption error:', error)
      return message // Return original if encryption fails
    }
  }

  // Decrypt message
  async decryptMessage(encryptedMessage, keyBase64) {
    try {
      if (!encryptedMessage || !keyBase64) return encryptedMessage

      const key = await this.importKey(keyBase64)
      const encryptedData = await this.base64ToArrayBuffer(encryptedMessage)

      // Extract IV (first 12 bytes) and encrypted data
      const iv = encryptedData.slice(0, 12)
      const data = encryptedData.slice(12)

      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        data
      )

      const decoder = new TextDecoder()
      return decoder.decode(decrypted)
    } catch (error) {
      console.error('Decryption error:', error)
      return encryptedMessage // Return as-is if decryption fails
    }
  }
}

export const encryptionUtil = new EncryptionUtil()

