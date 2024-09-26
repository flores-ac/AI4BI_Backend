const crypto = require('crypto');

// AES-256-CBC requires a 32-byte key and a 16-byte IV
const algorithm = 'aes-256-cbc';
const encryptionKey = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');  // Convert key to buffer

// Function to encrypt a token with a unique IV
function encryptToken(token) {
  // Generate a random 16-byte IV
  const iv = crypto.randomBytes(16);  // Ensure IV is always 16 bytes
  console.log('IV used for encryption:', iv.toString('hex'));  // Log IV for debugging
  
  const cipher = crypto.createCipheriv(algorithm, encryptionKey, iv);  // Use the IV with the encryption key
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Combine the IV and the encrypted token (store IV in hex)
  return `${iv.toString('hex')}:${encrypted}`;  // Return IV:encrypted data
}

// Function to decrypt a token (expects IV to be prepended to the encrypted data)
function decryptToken(encryptedToken) {
  // Split the IV and the encrypted data
  const [ivHex, encryptedData] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');  // Convert IV from hex to buffer
  console.log('IV used for decryption:', ivHex);  // Log IV for debugging
  
  const decipher = crypto.createDecipheriv(algorithm, encryptionKey, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = { encryptToken, decryptToken };
