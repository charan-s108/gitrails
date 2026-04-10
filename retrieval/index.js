import { LocalIndex } from 'vectra';
import { Embedder } from './embedder.js';
import { readFile, readdir } from 'fs/promises';
import { join, extname } from 'path';

const SUPPORTED = ['.js', '.ts', '.py', '.go', '.java', '.md'];
const CHUNK_SIZE = parseInt(process.env.GITRAILS_CHUNK_SIZE || '512');
const OVERLAP = parseInt(process.env.GITRAILS_CHUNK_OVERLAP || '64');
const TOP_K = parseInt(process.env.GITRAILS_TOP_K || '5');
const SKIP = ['node_modules', '.git', 'dist', 'build', '.gitagent',
              'knowledge/vector-index'];

export class VectorIndex {
  constructor(indexPath) {
    this.index = new LocalIndex(indexPath);
    this.embedder = new Embedder();
  }

  chunk(content, filePath) {
    const lines = content.split('\n');
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
      const text = lines.slice(i, i + CHUNK_SIZE).join('\n');
      if (text.trim().length > 20) {
        chunks.push({
          text,
          metadata: {
            file: filePath,
            start_line: String(i + 1),
            end_line: String(Math.min(i + CHUNK_SIZE, lines.length)),
          }
        });
      }
    }
    return chunks;
  }

  async build(rootPath) {
    if (process.argv.includes('--rebuild')) {
      await this.index.deleteIndex();
    }
    await this.index.createIndex();
    const files = await this.collectFiles(rootPath);
    for (const fp of files) {
      const content = await readFile(fp, 'utf-8');
      for (const chunk of this.chunk(content, fp)) {
        const vector = await this.embedder.embed(chunk.text);
        await this.index.insertItem({ vector, metadata: chunk.metadata });
      }
    }
    return files.length;
  }

  // Returns file paths + line ranges — NOT raw content
  // Agents must use git-read to fetch specific lines after this call
  async query(queryText, topK = TOP_K) {
    const v = await this.embedder.embed(queryText);
    const results = await this.index.queryItems(v, topK);
    return results.map(r => ({
      file: r.item.metadata.file,
      start_line: r.item.metadata.start_line,
      end_line: r.item.metadata.end_line,
      score: r.score,
    }));
  }

  async collectFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (SKIP.some(s => full.includes(s))) continue;
      if (e.isDirectory()) files.push(...await this.collectFiles(full));
      else if (SUPPORTED.includes(extname(e.name))) files.push(full);
    }
    return files;
  }
}

// CLI entry: node retrieval/index.js --build --root ./
if (process.argv.includes('--build')) {
  const idx = new VectorIndex(
    process.env.GITRAILS_VECTOR_INDEX_PATH || './knowledge/vector-index'
  );
  const root = process.argv[process.argv.indexOf('--root') + 1] || './';
  const count = await idx.build(root);
  console.log(`gitrails: indexed ${count} files`);
}

// CLI entry: node retrieval/index.js --query "search text" [--top-k 5]
// Outputs JSON array of { file, start_line, end_line, score }
if (process.argv.includes('--query')) {
  const queryIdx = process.argv.indexOf('--query');
  const queryText = process.argv[queryIdx + 1];
  if (!queryText) {
    console.error('Usage: node retrieval/index.js --query "search text" [--top-k 5]');
    process.exit(1);
  }
  const topKArg = process.argv.includes('--top-k')
    ? parseInt(process.argv[process.argv.indexOf('--top-k') + 1])
    : TOP_K;
  const idx = new VectorIndex(
    process.env.GITRAILS_VECTOR_INDEX_PATH || './knowledge/vector-index'
  );
  const results = await idx.query(queryText, topKArg);
  console.log(JSON.stringify(results, null, 2));
}
