import { Bitmap } from "./bitmap.js";
import * as _PNG from "pngjs";
const { PNG } = _PNG;
import * as JPEG from "jpeg-js";
import { getBytesBigEndian } from "./uint32.js";
import { hasOwnProperty, typedArrConcat } from "./util.js";
import type { Readable as ReadStream, Writable as WriteStream } from "stream";

export function make(w: number, h: number) {
  return new Bitmap(w, h);
}

export type PNGOptions = {
  deflateLevel?: number;
  deflateStrategy?: number;
};
/** Encode the PNG image to output stream */
export function encodePNGToStream(
  /** An instance of {@link Bitmap} to be encoded to PNG, `bitmap.data` must be a buffer of raw PNG data */
  bitmap: Bitmap,
  /** The stream to write the PNG file to */
  outstream: WriteStream,
  options: PNGOptions = {},
): Promise<void> {
  return new Promise((res, rej) => {
    if (
      !hasOwnProperty.call(bitmap, "data") ||
      !hasOwnProperty.call(bitmap, "width") ||
      !hasOwnProperty.call(bitmap, "height")
    ) {
      return rej(new TypeError("Invalid bitmap image provided"));
    }
    const png = new PNG({
      width: bitmap.width,
      height: bitmap.height,
      deflateLevel: options.deflateLevel || 9,
      deflateStrategy: options.deflateStrategy || 3,
    });

    for (let i = 0; i < bitmap.width; i++) {
      for (let j = 0; j < bitmap.height; j++) {
        const rgba = bitmap.getPixelRGBA(i, j);
        const n = (j * bitmap.width + i) * 4;
        const bytes = getBytesBigEndian(rgba);
        for (let k = 0; k < 4; k++) {
          png.data[n + k] = bytes[k];
        }
      }
    }

    png
      .on("error", (err) => {
        rej(err);
      })
      .pack()
      .pipe(outstream)
      .on("finish", () => {
        res();
      })
      .on("error", (err) => {
        rej(err);
      });
  });
}

/**
 * Decode PNG From Stream
 *
 * Decode a PNG file from an incoming readable stream
 */
export function decodePNGFromStream(
  /** A readable stream containing raw PNG data */
  instream: ReadStream,
): Promise<Bitmap> {
  return new Promise((res, rej) => {
    instream
      .pipe(new PNG())
      .on("parsed", function () {
        const bitmap = new Bitmap(this.width, this.height);
        for (let i = 0; i < bitmap.data.length; i++) {
          bitmap.data[i] = this.data[i];
        }
        res(bitmap);
      })
      .on("error", function (err) {
        rej(err);
      });
  });
}

/**
 * Encode JPEG To Stream
 *
 * Encode the JPEG image to output stream
 */
export function encodeJPEGToStream(
  /** An instance of {@link Bitmap} to be encoded to JPEG, `img.data` must be a buffer of raw JPEG data */
  img: Bitmap,
  /** The stream to write the raw JPEG buffer to */
  outstream: WriteStream,
  /** between 0 and 100 setting the JPEG quality */
  quality = 90,
): Promise<void> {
  return new Promise((res, rej) => {
    if (
      !hasOwnProperty.call(img, "data") ||
      !hasOwnProperty.call(img, "width") ||
      !hasOwnProperty.call(img, "height")
    ) {
      return rej(new TypeError("Invalid bitmap image provided"));
    }
    const data = {
      data: img.data,
      width: img.width,
      height: img.height,
    };
    outstream.on("error", (err) => rej(err));
    outstream.write(JPEG.encode(data, quality).data, () => {
      outstream.end();
      res();
    });
  });
}

/**
 * Decode JPEG From Stream
 *
 * Decode a JPEG image from an incoming stream of data
 */
export function decodeJPEGFromStream(
  /** A readable stream to decode JPEG data from */
  data: ReadStream,
  opts?: any,
): Promise<Bitmap> {
  return new Promise((res, rej) => {
    try {
      const chunks = [];
      data.on("data", (chunk) => chunks.push(chunk));
      data.on("end", () => {
        const buf = typedArrConcat(chunks);
        let rawImageData = null;
        try {
          rawImageData = JPEG.decode(buf, opts);
        } catch (err) {
          rej(err);
          return;
        }
        const bitmap = new Bitmap(rawImageData.width, rawImageData.height);
        for (let x_axis = 0; x_axis < rawImageData.width; x_axis++) {
          for (let y_axis = 0; y_axis < rawImageData.height; y_axis++) {
            const n = (y_axis * rawImageData.width + x_axis) * 4;
            bitmap.setPixelRGBA_i(
              x_axis,
              y_axis,
              rawImageData.data[n + 0],
              rawImageData.data[n + 1],
              rawImageData.data[n + 2],
              rawImageData.data[n + 3],
            );
          }
        }
        res(bitmap);
      });
      data.on("error", (err) => {
        rej(err);
      });
    } catch (e) {
      console.log(e);
      rej(e);
    }
  });
}
