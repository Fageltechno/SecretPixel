/* SecretPixel v1 binary format:
   4-byte magic "SPX1", 1-byte flags, 4-byte payload length (big-endian), payload bytes.
   The stream is embedded MSB-first into the LSB of RGB channels, row-major.
*/
const SPXStego = (() => {
  const MAGIC = [0x53,0x50,0x58,0x31]; // SPX1
  const HEADER_BYTES = 9;

  function bytesToBits(bytes) {
    const bits = new Uint8Array(bytes.length * 8);
    let k = 0;
    for (const byte of bytes) for (let bit=7; bit>=0; bit--) bits[k++] = (byte >> bit) & 1;
    return bits;
  }
  function bitsToBytes(bits) {
    const bytes = new Uint8Array(Math.floor(bits.length / 8));
    for (let i=0;i<bytes.length;i++) {
      let value=0;
      for (let j=0;j<8;j++) value=(value<<1)|bits[i*8+j];
      bytes[i]=value;
    }
    return bytes;
  }
  function buildPacket(payload, encrypted) {
    const packet = new Uint8Array(HEADER_BYTES + payload.length);
    packet.set(MAGIC,0);
    packet[4] = encrypted ? 1 : 0;
    new DataView(packet.buffer).setUint32(5,payload.length,false);
    packet.set(payload,HEADER_BYTES);
    return packet;
  }
  function capacityBytes(width,height) {
    return Math.max(0, Math.floor((width*height*3)/8) - HEADER_BYTES);
  }
  function embed(imageData, payload, encrypted=false) {
    const {width,height,data} = imageData;
    const packet = buildPacket(payload, encrypted);
    const bits = bytesToBits(packet);
    const channels = width*height*3;
    if (bits.length > channels) throw new Error(`Message too large. This image can hold about ${capacityBytes(width,height).toLocaleString()} bytes.`);
    let bitIndex=0;
    for (let p=0; p<data.length && bitIndex<bits.length; p+=4) {
      for (let c=0;c<3 && bitIndex<bits.length;c++) {
        data[p+c] = (data[p+c] & 0xFE) | bits[bitIndex++];
      }
    }
    return imageData;
  }
  function extract(imageData) {
    const {width,height,data} = imageData;
    const channels = width*height*3;
    const readBytes = (count, startBit=0) => {
      if (startBit + count*8 > channels) throw new Error("No valid SecretPixel message found.");
      const bits = new Uint8Array(count*8);
      let bitIndex=0, channelIndex=0;
      for (let p=0;p<data.length && bitIndex<bits.length;p+=4) {
        for (let c=0;c<3 && bitIndex<bits.length;c++,channelIndex++) {
          if (channelIndex >= startBit) bits[bitIndex++] = data[p+c] & 1;
        }
      }
      return bitsToBytes(bits);
    };
    const header=readBytes(HEADER_BYTES);
    if (!MAGIC.every((v,i)=>header[i]===v)) throw new Error("No SecretPixel message found. Make sure this is the original, unmodified PNG.");
    const length=new DataView(header.buffer,header.byteOffset,header.byteLength).getUint32(5,false);
    if (length > capacityBytes(width,height)) throw new Error("The hidden-data header is invalid or the image was modified.");
    const payload=readBytes(length,HEADER_BYTES*8);
    return {payload, encrypted: (header[4] & 1) === 1};
  }
  return {embed, extract, capacityBytes};
})();
