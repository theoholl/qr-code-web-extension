import { BinaryBitmap, HybridBinarizer, QRCodeReader, LuminanceSource } from "npm:@zxing/library";
import qr from "../qr.ts";


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
        const invertedBooleanMatrix = this.booleanMatrix.map(row => row.map(value => !value));
        return new BooleanLuminanceSource(invertedBooleanMatrix);
    }
}

Deno.test(function decodeQrCode() {
    const qrCodeBinary: number[][] = qr.generate("Hello, world!");

    // Convert binary number array (0, 1) to boolean array.
    // Map 0 (white) to true (white) and 1 (black) to false (black)
    const qrCodeAsBooleanArray: boolean[][] = qrCodeBinary.map(row =>
      row.map(pixel => pixel === 0)
    );

    // Use the custom LuminanceSource to wrap the boolean array
    const luminanceSource = new BooleanLuminanceSource(qrCodeAsBooleanArray);

    // Then create a BinaryBitmap using a HybridBinarizer
    const binaryBitmap = new BinaryBitmap(new HybridBinarizer(luminanceSource));
    
    // Initialize and use the QR code reader to decode the bitmap
    const reader = new QRCodeReader();
    try {
        const result = reader.decode(binaryBitmap);
        console.log('Decoded text:', result.getText());
    } catch (error) {
        console.error('Failed to decode QR code:', error);
    }
});