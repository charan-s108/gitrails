import { LocalIndex }              from 'vectra';
import { Embedder }                 from './embedder.js';
import { readFile, readdir, writeFile } from 'fs/promises';
import { existsSync }               from 'fs';
import { join, extname }            from 'path';
import { createHash }               from 'crypto';

const SUPPORTED = ['.js', '.ts', '.py', '.go', '.java', '.md'];
const CHUNK_SIZE = parseInt(process.env.GITRAILS_CHUNK_SIZE  || '512');
const OVERLAP    = parseInt(process.env.GITRAILS_CHUNK_OVERLAP || '64');
const TOP_K      = parseInt(process.env.GITRAILS_TOP_K         || '5');
const SKIP = ['node_modules', '.git', 'dist', 'build', '.gitagent',
              'knowledge/vector-index'];

const INDEX_PATH = process.env.GITRAILS_VECTOR_INDEX_PATH || './knowledge/vector-index';
// Cache manifest: records {file_path → sha1_of_content} for incremental builds.
// Unchanged files skip re-embedding — saves ~70% compute on incremental PRs.
const CACHE_PATH = join(INDEX_PATH, 'embed-cache.json');

export class VectorIndex {
  constructor(indexPath) {
    this.indexPath = indexPath;
    this.index     = new LocalIndex(indexPath);
    this.embedder  = new Embedder();
    this.cache     = {};   // path → sha1
  }

  // ── Cache helpers ─────────────────────────────────────────────────────────

  async loadCache() {
    if (existsSync(CACHE_PATH)) {
      try { this.cache = JSON.parse(await readFile(CACHE_PATH, 'utf-8')); } catch { this.cache = {}; }
    }
  }

  async saveCache() {
    await writeFile(CACHE_PATH, JSON.stringify(this.cache, null, 2));
  }

  sha1(content) {
    return createHash('sha1').update(content).digest('hex');
  }

  // ── Chunking ──────────────────────────────────────────────────────────────

  chunk(content, filePath) {
    const lines  = content.split('\n');
    const chunks = [];
    for (let i = 0; i < lines.length; i += CHUNK_SIZE - OVERLAP) {
      const text = lines.slice(i, i + CHUNK_SIZE).join('\n');
      if (text.trim().length > 20) {
        chunks.push({
          text,
          metadata: {
            file:       filePath,
            start_line: String(i + 1),
            end_line:   String(Math.min(i + CHUNK_SIZE, lines.length)),
          },
        });
      }
    }
    return chunks;
  }

  // ── Build (incremental by default, full with --rebuild) ───────────────────
  // Incremental: only re-embeds files whose sha1 has changed since last build.
  // Typical savings on a 2-file PR touching a 500-file repo: ~99% of embedding work skipped.

  async build(rootPath, forceRebuild = false) {
    if (forceRebuild) {
      await this.index.deleteIndex();
      this.cache = {};
    }
    await this.index.createIndex();
    await this.loadCache();

    const files   = await this.collectFiles(rootPath);
    let indexed   = 0;
    let skipped   = 0;

    for (const fp of files) {
      const content = await readFile(fp, 'utf-8');
      const sha     = this.sha1(content);

      if (!forceRebuild && this.cache[fp] === sha) {
        skipped++;
        continue;   // file unchanged — skip re-embedding
      }

      for (const chunk of this.chunk(content, fp)) {
        const vector = await this.embedder.embed(chunk.text);
        await this.index.insertItem({ vector, metadata: chunk.metadata });
      }

      this.cache[fp] = sha;
      indexed++;
    }

    await this.saveCache();
    return { indexed, skipped, total: files.length };
  }

  // ── Query ─────────────────────────────────────────────────────────────────
  // Returns file paths + line ranges — NOT raw content.
  // Callers use git-read to fetch specific lines after this call.

  async query(queryText, topK = TOP_K) {
    const v       = await this.embedder.embed(queryText);
    const results = await this.index.queryItems(v, topK);
    return results.map(r => ({
      file:       r.item.metadata.file,
      start_line: r.item.metadata.start_line,
      end_line:   r.item.metadata.end_line,
      score:      r.score,
    }));
  }

  // ── File collection ───────────────────────────────────────────────────────

  async collectFiles(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files   = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (SKIP.some(s => full.includes(s))) continue;
      if (e.isDirectory()) files.push(...await this.collectFiles(full));
      else if (SUPPORTED.includes(extname(e.name))) files.push(full);
    }
    return files;
  }
}

// ── CLI: --build [--rebuild] [--root dir] ─────────────────────────────────────

if (process.argv.includes('--build')) {
  const forceRebuild = process.argv.includes('--rebuild');
  const root   = process.argv.includes('--root')
    ? process.argv[process.argv.indexOf('--root') + 1]
    : './';
  const idx    = new VectorIndex(INDEX_PATH);
  const result = await idx.build(root, forceRebuild);
  console.log(
    `gitrails: indexed ${result.indexed} file(s)` +
    (result.skipped ? `, skipped ${result.skipped} unchanged` : '') +
    ` (${result.total} total)`
  );
}

// ── CLI: --query "text" [--top-k N] ──────────────────────────────────────────
// Outputs JSON array of { file, start_line, end_line, score }

if (process.argv.includes('--query')) {
  const queryIdx  = process.argv.indexOf('--query');
  const queryText = process.argv[queryIdx + 1];
  if (!queryText) {
    console.error('Usage: node retrieval/index.js --query "search text" [--top-k 5]');
    process.exit(1);
  }
  const topKArg = process.argv.includes('--top-k')
    ? parseInt(process.argv[process.argv.indexOf('--top-k') + 1])
    : TOP_K;
  const idx     = new VectorIndex(INDEX_PATH);
  const results = await idx.query(queryText, topKArg);
  console.log(JSON.stringify(results, null, 2));
}
