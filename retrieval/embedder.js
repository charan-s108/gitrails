import { pipeline } from '@xenova/transformers';

const MODEL = process.env.GITRAILS_EMBEDDING_MODEL || 'Xenova/all-MiniLM-L6-v2';

export class Embedder {
  constructor() { this.pipe = null; }

  async init() {
    if (!this.pipe) {
      // Downloads once (~80MB), cached locally — no API calls ever
      this.pipe = await pipeline('feature-extraction', MODEL);
    }
  }

  async embed(text) {
    await this.init();
    const output = await this.pipe(text, { pooling: 'mean', normalize: true });
    return Array.from(output.data);
  }
}
