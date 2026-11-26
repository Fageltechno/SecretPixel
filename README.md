# SecretPixel v1.0

A standalone browser-based image steganography project. It hides text inside image RGB least-significant bits (LSB), with optional AES-GCM password encryption.

## Features
- Hide text inside PNG output using RGB LSB.
- Reveal messages embedded by SecretPixel v1.
- Optional AES-GCM encryption using a password-derived key (PBKDF2/SHA-256).
- Image inspector: dimensions, file size, format and estimated capacity.
- Funny semester-themed prank message presets.
- Local-only processing: no backend, database, account or upload service.

## Run
1. Extract the ZIP file.
2. Open the `SecretPixel_v1` folder in VS Code.
3. Open `index.html` with Live Server, or open it directly in a modern browser.
4. Use the sidebar to Hide, Reveal, Inspect, or explore the Prank Lab.

For Web Crypto password encryption, use a secure browser context such as `http://localhost` via Live Server or HTTPS. Plain LSB mode works without password encryption.

## Important
- Use the generated PNG as a file/document when sharing.
- Do not screenshot, resize, crop, edit, filter, or recompress the image. Such operations can destroy LSB data.
- This is a simple educational steganography tool, not a guarantee of undetectability or secure communication.
- The receiver needs the original unmodified image. For encrypted messages, the receiver also needs the password.
- The current v1 format is custom to SecretPixel and is not automatically compatible with unrelated steganography tools.

## Project structure
```text
SecretPixel_v1/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── crypto.js
│   └── steganography.js
└── README.md
```
