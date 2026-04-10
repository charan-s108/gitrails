import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Pattern maps per language — no AST parser needed, regex is sufficient
const FN_PATTERNS = {
  '.js':  [/function\s+(\w+)\s*\(/g, /const\s+(\w+)\s*=\s*(?:async\s*)?\(/g],
  '.ts':  [/(?:async\s+)?function\s+(\w+)/g, /(?:public|private|protected)?\s+(?:async\s+)?(\w+)\s*\(/g],
  '.py':  [/def\s+(\w+)\s*\(/g, /async\s+def\s+(\w+)\s*\(/g],
  '.go':  [/func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/g],
  '.java':[/(?:public|private|protected|static|\s)+[\w\<\>\[\]]+\s+(\w+)\s*\(/g],
};

const IMPORT_PATTERNS = {
  '.js': [/(?:import|require)\s*(?:\{[^}]+\}|\w+)\s*from\s*['"]([^'"]+)['"]/g],
  '.ts': [/import\s*(?:\{[^}]+\}|\w+|\*)\s*from\s*['"]([^'"]+)['"]/g],
  '.py': [/from\s+([\w.]+)\s+import/g, /^import\s+([\w.]+)/gm],
};

export class CodeGraph {
  constructor(graphPath) {
    this.graphPath = graphPath;
    this.graph = {};
  }

  async load() {
    if (existsSync(this.graphPath)) {
      this.graph = JSON.parse(await readFile(this.graphPath, 'utf-8'));
    }
  }

  async save() {
    await writeFile(this.graphPath, JSON.stringify(this.graph, null, 2));
  }

  extract(content, ext, patterns) {
    const results = new Set();
    for (const p of (patterns[ext] || [])) {
      const re = new RegExp(p.source, p.flags);
      let m;
      while ((m = re.exec(content)) !== null) {
        if (m[1] && m[1].length > 1) results.add(m[1]);
      }
    }
    return [...results];
  }

  async build(_rootPath, files) {
    const { readFile } = await import('fs/promises');
    const { extname } = await import('path');
    for (const fp of files) {
      try {
        const content = await readFile(fp, 'utf-8');
        const ext = extname(fp);
        this.graph[fp] = {
          functions: this.extract(content, ext, FN_PATTERNS),
          imports: this.extract(content, ext, IMPORT_PATTERNS),
          line_count: String(content.split('\n').length),
          complexity: String(
            (content.match(/if|else|for|while|switch|catch|\?/g) || []).length
          ),
        };
      } catch { /* skip unreadable files */ }
    }
    await this.save();
  }

  // All files that reference a given symbol — no file reads needed
  findCallers(symbol) {
    return Object.entries(this.graph)
      .filter(([, d]) => d.functions.includes(symbol) ||
        d.imports.some(i => i.includes(symbol)))
      .map(([f]) => f);
  }

  // High-complexity files sorted descending — hotspots for bug/security review
  getHotspots(threshold = 10) {
    return Object.entries(this.graph)
      .filter(([, d]) => parseInt(d.complexity) >= threshold)
      .sort(([, a], [, b]) => parseInt(b.complexity) - parseInt(a.complexity))
      .map(([file, d]) => ({ file, complexity: d.complexity }));
  }

  // All function names in a file — no file read needed
  getFunctions(filePath) {
    return this.graph[filePath]?.functions || [];
  }
}

// CLI entry: node retrieval/graph.js --hotspots [--threshold 10]
// Outputs JSON array of { file, complexity }
if (process.argv.includes('--hotspots')) {
  const threshold = process.argv.includes('--threshold')
    ? parseInt(process.argv[process.argv.indexOf('--threshold') + 1])
    : 10;
  const graph = new CodeGraph(
    process.env.GITRAILS_GRAPH_PATH || './knowledge/graph.json'
  );
  await graph.load();
  const hotspots = graph.getHotspots(threshold);
  console.log(JSON.stringify(hotspots, null, 2));
}

// CLI entry: node retrieval/graph.js --functions <filepath>
// Outputs JSON array of function names in a file
if (process.argv.includes('--functions')) {
  const fp = process.argv[process.argv.indexOf('--functions') + 1];
  const graph = new CodeGraph(
    process.env.GITRAILS_GRAPH_PATH || './knowledge/graph.json'
  );
  await graph.load();
  console.log(JSON.stringify(graph.getFunctions(fp), null, 2));
}

// CLI entry: node retrieval/graph.js --build --root ./
if (process.argv.includes('--build')) {
  const { readdir } = await import('fs/promises');
  const { join, extname } = await import('path');
  const SUPPORTED = ['.js', '.ts', '.py', '.go', '.java'];
  const SKIP = ['node_modules', '.git', 'dist', '.gitagent'];

  async function collect(dir) {
    const entries = await readdir(dir, { withFileTypes: true });
    const files = [];
    for (const e of entries) {
      const full = join(dir, e.name);
      if (SKIP.some(s => full.includes(s))) continue;
      if (e.isDirectory()) files.push(...await collect(full));
      else if (SUPPORTED.includes(extname(e.name))) files.push(full);
    }
    return files;
  }

  const root = process.argv[process.argv.indexOf('--root') + 1] || './';
  const graph = new CodeGraph(
    process.env.GITRAILS_GRAPH_PATH || './knowledge/graph.json'
  );
  const files = await collect(root);
  await graph.build(root, files);
  console.log(`gitrails: graph built for ${files.length} files`);
}
