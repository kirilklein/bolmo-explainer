// Builds index.html from src/: injects the first 24,576 cl100k_base merge ranks, gzipped,
// so the page can run byte-level BPE with no network access.
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import cl100k from 'js-tiktoken/ranks/cl100k_base';

const N = 24576;
const root = fileURLToPath(new URL('..', import.meta.url));

// js-tiktoken stores ranks as lines of "prefix offset tok tok ...", each token base64-encoded
const byRank = [];
for (const line of cl100k.bpe_ranks.split('\n').filter(Boolean)) {
  const [, off, ...toks] = line.split(' ');
  toks.forEach((t, i) => { const r = +off + i; if (r < N) byRank[r] = Buffer.from(t, 'base64'); });
}
// one length byte per token, then its bytes, in rank order
const blob = Buffer.concat(byRank.flatMap((b) => [Buffer.from([b.length]), b]));
const gz = zlib.gzipSync(blob, { level: 9 }).toString('base64');

const head = fs.readFileSync(root + 'src/head.html', 'utf8');
const body = fs.readFileSync(root + 'src/body.html', 'utf8').replace('__VOCAB_GZ_B64__', gz);
fs.writeFileSync(root + 'index.html', `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n${head}</head>\n<body>\n${body}</body>\n</html>\n`);
console.log(`index.html written (${Math.round(fs.statSync(root + 'index.html').size / 1024)} KB)`);
