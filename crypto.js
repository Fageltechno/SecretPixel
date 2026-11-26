/* Password-based encryption helpers. Uses the browser Web Crypto API. */
const SPXCrypto = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const ITERATIONS = 250000;

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      {name:"PBKDF2", salt, iterations:ITERATIONS, hash:"SHA-256"},
      material, {name:"AES-GCM", length:256}, false, ["encrypt","decrypt"]
    );
  }
  async function encrypt(text, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const ciphertext = await crypto.subtle.encrypt({name:"AES-GCM", iv}, key, enc.encode(text));
    const out = new Uint8Array(1 + salt.length + iv.length + ciphertext.byteLength);
    out[0] = 1;
    out.set(salt, 1);
    out.set(iv, 17);
    out.set(new Uint8Array(ciphertext), 29);
    return out;
  }
  async function decrypt(bytes, password) {
    if (bytes.length < 46 || bytes[0] !== 1) throw new Error("Invalid encrypted message format.");
    const salt = bytes.slice(1,17), iv = bytes.slice(17,29), ciphertext = bytes.slice(29);
    const key = await deriveKey(password, salt);
    try {
      const plain = await crypto.subtle.decrypt({name:"AES-GCM", iv}, key, ciphertext);
      return dec.decode(plain);
    } catch {
      throw new Error("Wrong password or damaged encrypted message.");
    }
  }
  return {encrypt, decrypt};
})();
