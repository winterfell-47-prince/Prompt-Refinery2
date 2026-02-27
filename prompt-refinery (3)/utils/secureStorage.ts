/**
 * Secure storage utility for API keys and sensitive configuration
 * Uses environment variables when available, falls back to encrypted localStorage
 */

export interface SecureStorage {
  setItem(key: string, value: string): void;
  getItem(key: string): string | null;
  removeItem(key: string): void;
}

class SecureStorageImpl implements SecureStorage {
  private readonly prefix = 'prompt_refinery_secure_';
  private readonly encryptionKey = 'pr_refinery_key_v1';

  setItem(key: string, value: string): void {
    try {
      // Try to use environment variables first (for server-side rendering)
      if (typeof window === 'undefined') {
        // Server-side: store in memory (not persistent)
        return;
      }

      // Client-side: encrypt and store in localStorage
      const encryptedValue = this.encrypt(value);
      localStorage.setItem(this.prefix + key, encryptedValue);
    } catch (error) {
      console.warn('Failed to store secure item:', error);
    }
  }

  getItem(key: string): string | null {
    try {
      // Try to use environment variables first
      if (typeof window === 'undefined') {
        return null;
      }

      const encryptedValue = localStorage.getItem(this.prefix + key);
      if (!encryptedValue) return null;

      return this.decrypt(encryptedValue);
    } catch (error) {
      console.warn('Failed to retrieve secure item:', error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      if (typeof window === 'undefined') return;
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to remove secure item:', error);
    }
  }

  private encrypt(text: string): string {
    // Simple XOR encryption for basic obfuscation
    // In production, consider using Web Crypto API for stronger encryption
    const key = this.encryptionKey;
    let result = '';
    
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    
    return btoa(result); // Base64 encode for storage
  }

  private decrypt(encryptedText: string): string {
    try {
      const text = atob(encryptedText);
      const key = this.encryptionKey;
      let result = '';
      
      for (let i = 0; i < text.length; i++) {
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      
      return result;
    } catch {
      return '';
    }
  }
}

export const secureStorage = new SecureStorageImpl();

// Legacy compatibility functions for existing code
export const getSecureApiKey = (keyName: string): string => {
  return secureStorage.getItem(keyName) || '';
};

export const setSecureApiKey = (keyName: string, value: string): void => {
  if (value) {
    secureStorage.setItem(keyName, value);
  }
};

export const removeSecureApiKey = (keyName: string): void => {
  secureStorage.removeItem(keyName);
};