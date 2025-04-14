import {
  BinaryBitmap,
  DecodeHintType,
  HybridBinarizer,
  LuminanceSource,
  QRCodeReader,
} from "npm:@zxing/library";
import qr from "../qr.ts";
import { assertEquals, assertNotEquals, assertThrows } from "@std/assert";

// Custom LuminanceSource that converts a boolean[][] into grayscale pixel data
class BooleanLuminanceSource extends LuminanceSource {
  private luminances: Uint8ClampedArray;

  constructor(private booleanMatrix: boolean[][]) {
    // Set width to the number of columns (assumed constant) and height to number of rows
    super(booleanMatrix[0].length, booleanMatrix.length);
    // Convert boolean matrix into a flat array of luminance values
    this.luminances = new Uint8ClampedArray(this.getWidth() * this.getHeight());
    for (let y = 0; y < this.getHeight(); y++) {
      for (let x = 0; x < this.getWidth(); x++) {
        // Map true to white (255) and false to black (0)
        this.luminances[y * this.getWidth() + x] = booleanMatrix[y][x] ? 255 : 0;
      }
    }
  }

  getRow(y: number, row?: Uint8ClampedArray): Uint8ClampedArray {
    if (y < 0 || y >= this.getHeight()) {
      throw new Error("Requested row is outside the image: " + y);
    }
    const width = this.getWidth();
    const rowData = row || new Uint8ClampedArray(width);
    for (let x = 0; x < width; x++) {
      rowData[x] = this.luminances[y * width + x];
    }
    return rowData;
  }

  getMatrix(): Uint8ClampedArray {
    return this.luminances;
  }

  override isCropSupported(): boolean {
    return false;
  }

  override crop(left: number, top: number, width: number, height: number): LuminanceSource {
    throw new Error("Crop is not supported.");
  }

  override isRotateSupported(): boolean {
    return false;
  }
  override rotateCounterClockwise(): LuminanceSource {
    throw new Error("Rotation is not supported.");
  }

  invert(): LuminanceSource {
    const invertedBooleanMatrix = this.booleanMatrix.map((row) => row.map((value) => !value));
    return new BooleanLuminanceSource(invertedBooleanMatrix);
  }
}

Deno.test(function emptyString() {
  const result = qr.generate("");
  assertNotEquals(result, []);
});

Deno.test(function tooLongString() {
  const randomString = "a".repeat(2954);
  assertThrows(() => qr.generate(randomString));
});

Deno.test("Decode 'Hello, world!'", () => {
  const qrCodeBinary: number[][] = qr.generate("Hello, world!");

  // Convert binary number array (0, 1) to boolean array.
  // Map 0 (white) to true (white) and 1 (black) to false (black)
  const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map((row) =>
    row.map((pixel) => pixel === 0)
  );

  // Use the custom LuminanceSource to wrap the boolean array
  const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

  // Then create a BinaryBitmap using a HybridBinarizer
  const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

  // Initialize and use the QR code reader to decode the bitmap
  const reader = new QRCodeReader();
  try {
    const result = reader.decode(binaryBitmap);
    assertEquals(result.getText(), "Hello, world!");
  } catch (error) {
    console.error("Failed to decode QR code:", error);
    throw error; // Re-throw the error to fail the test
  }
});

Deno.test("Decode 1000 random strings", () => {
  for (let i = 0; i < 1000; i++) {
    // Generate a random string
    const randomString =
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Generate QR code from the random string
    const qrCodeBinary: number[][] = qr.generate(randomString);

    // Convert binary number array (0, 1) to boolean array
    const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map((row) =>
      row.map((pixel) => pixel === 0)
    );

    // Use the custom LuminanceSource to wrap the boolean array
    const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

    // Create a BinaryBitmap using a HybridBinarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // Initialize and use the QR code reader to decode the bitmap
    const reader = new QRCodeReader();
    try {
      const result = reader.decode(binaryBitmap);
      assertEquals(result.getText(), randomString, `Failed to decode string: ${randomString}`);
    } catch (error) {
      console.error(`Failed to decode QR code for string: ${randomString}`, error);
      throw error; // Re-throw the error to fail the test
    }
  }
});

Deno.test("Decode 100 simple URLs", async () => {
  const urls = await Deno.readTextFile("./simple-urls.txt");
  const urlList = urls
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url.length > 0);

  for (const url of urlList) {
    // Generate QR code from the URL
    const qrCodeBinary: number[][] = qr.generate(url);

    // Convert binary number array (0, 1) to boolean array
    const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map((row) =>
      row.map((pixel) => pixel === 0)
    );

    // Use the custom LuminanceSource to wrap the boolean array
    const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

    // Create a BinaryBitmap using a HybridBinarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // Initialize and use the QR code reader to decode the bitmap
    const reader = new QRCodeReader();
    try {
      const result = reader.decode(binaryBitmap);
      assertEquals(result.getText(), url, `Failed to decode URL: ${url}`);
    } catch (error) {
      console.error(`Failed to decode QR code for URL: ${url}`, error);
      throw error; // Re-throw the error to fail the test
    }
  }
});

Deno.test("Decode complex URLs", () => {
  const complexUrls = [
    "https://example.com/path/to/resource?query=123&filter=test#section",
    "https://subdomain.example.org:8080/path/to/resource?param=value&other=123",
    "https://www.example.com/some/very/long/path/with/multiple/segments/and/query?key1=value1&key2=value2",
    "https://example.com/#fragment-only",
    "https://example.com/path?encoded=%20%3D%26%25",
    "https://user:password@example.com:8443/path?query=1#fragment",
    "ftp://ftp.example.com/resource",
    "mailto:user@example.com",
    "https://example.com/special-characters-!@#$%^&*()_+=-",
  ];

  for (const url of complexUrls) {
    // Generate QR code from the URL
    const qrCodeBinary: number[][] = qr.generate(url);

    // Convert binary number array (0, 1) to boolean array
    const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map((row) =>
      row.map((pixel) => pixel === 0)
    );

    // Use the custom LuminanceSource to wrap the boolean array
    const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

    // Create a BinaryBitmap using a HybridBinarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // Initialize and use the QR code reader to decode the bitmap
    const reader = new QRCodeReader();
    const hints = new Map();
    hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
    try {
      const result = reader.decode(binaryBitmap, hints);
      assertEquals(result.getText(), url, `Failed to decode URL: ${url}`);
    } catch (error) {
      console.error(`Failed to decode QR code for URL: ${url}`, error);
      throw error; // Re-throw the error to fail the test
    }
  }
});

Deno.test("Encode and decode unicode characters", () => {
  const unicodeStrings = [
    "こんにちは", // Japanese for "Hello"
    "你好", // Chinese for "Hello"
    "안녕하세요", // Korean for "Hello"
    "Привет", // Russian for "Hello"
    "مرحبا", // Arabic for "Hello"
    "😀", // Emoji
    "🚀🌕", // Rocket and moon emoji
  ];

  for (const str of unicodeStrings) {
    // Generate QR code from the string
    const qrCodeBinary: number[][] = qr.generate(str);

    // Convert binary number array (0, 1) to boolean array
    const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map((row) =>
      row.map((pixel) => pixel === 0)
    );

    // Use the custom LuminanceSource to wrap the boolean array
    const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

    // Create a BinaryBitmap using a HybridBinarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // Initialize and use the QR code reader to decode the bitmap
    const reader = new QRCodeReader();
    const hints = new Map();
    hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
    try {
      const result = reader.decode(binaryBitmap, hints);
      assertEquals(result.getText(), str, `Failed to decode string: ${str}`);
    } catch (error) {
      console.error(`Failed to decode QR code for string: ${str}`, error);
      throw error; // Re-throw the error to fail the test
    }
  }
});

// Decode URLs with Unicode characters
Deno.test("Decode URLs with Unicode characters", () => {
  const unicodeUrls = [
    // "https://example.com/こんにちは",
    "https://example.com/你好",
    // "https://example.com/안녕하세요",
    "https://example.com/Привет",
    "https://example.com/مرحبا",
    "https://example.com/😀",
    "https://example.com/🚀🌕",
  ];

  for (const url of unicodeUrls) {
    // Generate QR code from the URL
    const qrCodeBinary: number[][] = qr.generate(url);

    // Convert binary number array (0, 1) to boolean array
    const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map((row) =>
      row.map((pixel) => pixel === 0)
    );

    // Use the custom LuminanceSource to wrap the boolean array
    const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

    // Create a BinaryBitmap using a HybridBinarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));

    // Initialize and use the QR code reader to decode the bitmap
    const reader = new QRCodeReader();
    const hints = new Map();
    hints.set(DecodeHintType.CHARACTER_SET, "UTF-8");
    try {
      const result = reader.decode(binaryBitmap, hints);
      assertEquals(result.getText(), url, `Failed to decode URL: ${url}`);
    } catch (error) {
      console.error(`Failed to decode QR code for URL: ${url}`, error);
      throw error; // Re-throw the error to fail the test
    }
  }
});
