import * as png_metadata from "png-metadata";
import { crc32 } from "./crc32";

/* From the spec (http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html)
  4.2.3.3. iTXt International textual data

 This chunk is semantically equivalent to the tEXt and zTXt chunks, but the
 textual data is in the UTF-8 encoding of the Unicode character set instead of
 Latin-1. This chunk contains:

   Keyword:             1-79 bytes (character string)
   Null separator:      1 byte
   Compression flag:    1 byte
   Compression method:  1 byte
   Language tag:        0 or more bytes (character string)
   Null separator:      1 byte
   Translated keyword:  0 or more bytes
   Null separator:      1 byte
   Text:                0 or more bytes

   [Other notes: keywords should be Latin1?]
*/
interface PngChunk {
  type: string;
  data: string;
  size: number;
  crc: number;
}

export class PngImage {
  constructor(private _buffer: Buffer) {}

  get buffer(): Buffer {
    return this._buffer;
  }

  setTextTags(tags: Map<string, string>) {
    const bufferAsText = this.buffer.toString("binary");
    let chunks: PngChunk[] = png_metadata.splitChunk(bufferAsText);
    for (const chunk of chunks) {
      console.log(chunk.type);
    }
    /* Filter down to non-text chunks */
    chunks = chunks.filter(chunk => !["iTXt", "tEXt"].includes(chunk.type));
    const newChunks = new Array<PngChunk>();
    for (const [keyword, text] of tags.entries()) {
      /* TODO, intelligently use the right tag type. */
      const newChunk = new TextualData(keyword, text);
      newChunks.push(newChunk);
    }
    chunks = [].concat(chunks.slice(0, 1), newChunks, chunks.slice(1));
    this._buffer = Buffer.from(
      png_metadata.joinChunk(chunks) as string,
      "binary"
    );
  }

  getTextTags(): Map<string, string> {
    const bufferAsText = this.buffer.toString("binary");
    const chunks: PngChunk[] = png_metadata.splitChunk(bufferAsText);
    const tags = new Map<string, string>();
    for (const chunk of chunks) {
      let textData: TextishData;
      if (chunk.type == "iTXt") {
        textData = InternationalTextualData.fromString(chunk.data);
      }
      if (chunk.type == "tEXt") {
        textData = TextualData.fromString(chunk.data);
      }
      /* TODO, implement compression */
    }
    return tags;
  }
}

abstract class PngData implements PngChunk {
  type: string;
  data: string;
  get size(): number {
    return this.data.length;
  }

  get crc(): number {
    return crc32(this.type + this.data);
  }
}

interface TextishData {
  keyword: string;
  text: string;
}

class TextualData extends PngData implements TextishData {
  constructor(public readonly keyword: string, public readonly text: string) {
    super();
  }

  static fromString(s: string): TextualData {
    const [keyword, text] = s.split("\0", 2);
    return new TextualData(keyword, text);
  }

  readonly type: string = "tEXt";
  /* To a Latin1 encoded string */
  get data(): string {
    /* TODO: Verify that keyword is Latin1 */
    return [this.keyword, this.text].join("\0");
  }
}

class InternationalTextualData extends PngData implements TextishData {
  constructor(
    public readonly keyword: string,
    public readonly text: string,
    public readonly compressed?: boolean /* TODO: Add compression support */,
    public readonly language_tag?: string,
    public readonly translated_keyword?: string
  ) {
    super();
  }
  /* From a Latin1 encoded string */
  static fromString(s: string): InternationalTextualData {
    let remainder,
      keyword,
      compression_info,
      language_tag,
      translated_keyword,
      text;
    [keyword, s] = s.split("\0", 2);
    compression_info = s.slice(0, 2);
    s = s.slice(2);
    [language_tag, translated_keyword, text] = s.split("\0");
    return new InternationalTextualData(
      keyword,
      text,
      false,
      language_tag,
      translated_keyword
    );
  }

  readonly type: string = "iTXt";
  /* To a Latin1 encoded string */
  get data(): string {
    /* TODO: Verify that keyword is Latin1 */
    return [
      this.keyword,
      "\0",
      "\0",
      "\0",
      this.language_tag || "",
      this.translated_keyword || "",
      this.text
    ].join("\0");
  }
}
