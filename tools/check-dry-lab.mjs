import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom' });
try {
  const { pages, navigation, pageOrder } = await server.ssrLoadModule('/src/site-data.ts');
  const { ArticleBlocks } = await server.ssrLoadModule('/src/ArticleBlocks.tsx');
  const items = navigation.find(g => g.label === 'Dry Lab').items;
  assert.deepEqual(items.map(([label]) => label), ['Transcriptomics','Metabolomics','Protein','Mathematical Modeling','Hardware']);
  assert.equal(new Set(pageOrder).size, pageOrder.length);
  for (const [, href] of items) assert(pages[href.slice(1)], `Missing route ${href}`);
  for (const slug of ['metabolomics','protein','hardware']) {
    assert.equal(pages[slug].sections.length, 0);
    assert.equal(pages[slug].intro, '');
  }
  let figures = 0;
  let tables = 0;
  for (const slug of ['dry-lab','transcriptomics','model']) {
    const page = pages[slug];
    assert(!/[\u3400-\u9fff]/u.test(JSON.stringify(page)), `Non-English content: ${slug}`);
    for (const section of page.sections) {
      for (const block of section.blocks ?? []) {
        if (block.kind === 'figure') {
          figures++;
          assert(fs.existsSync(path.join('public', block.src)), `Missing ${block.src}`);
          assert(block.alt && block.caption);
        }
        if (block.kind === 'table') {
          tables++;
          assert(block.rows.every(row => row.length === block.columns.length), block.caption);
        }
        if (block.kind === 'links') for (const link of block.links) {
          if (link.href.startsWith('/')) assert(pages[link.href.slice(1)], link.href);
          else assert.equal(new URL(link.href).protocol, 'https:');
        }
      }
      const html = renderToStaticMarkup(React.createElement(MemoryRouter, null,
        React.createElement(ArticleBlocks, { blocks: section.blocks ?? [] })));
      assert(!html.includes('undefined'), section.title);
      assert(!html.includes('src="/figures/'), 'Figure omitted deployment base');
    }
  }
  const data = JSON.parse(fs.readFileSync('src/content/dry-lab-tables.json','utf8'));
  assert.equal(data.TF_RANKING.rows.length,333);
  data.TF_RANKING.rows.forEach((row,i)=>assert.equal(Number(row[0]), i+1));
  assert.equal(data.RECOVERY.rows.length,16);
  assert.equal(data.PARAMETERS.rows.length,31);
  assert.equal(data.ELASTICITY.rows.length,29);
  const ode = pages.model.sections.flatMap(s=>s.blocks ?? []).find(b=>b.kind==='equation' && b.label==='Nine-state ODE system');
  assert.equal(ode.text.split('\n').length,9);
  const provenance = JSON.parse(fs.readFileSync('src/content/dry-lab-provenance.json','utf8'));
  for (const [file, hash] of Object.entries(provenance.figure_sha256)) {
    assert.equal(createHash('sha256').update(fs.readFileSync(`public/figures/dry-lab/${file}`)).digest('hex'), hash);
  }
  assert.equal(figures,11);
  const workflow = fs.readFileSync('.github/workflows/pages.yml','utf8');
  for(const slug of ['dry-lab','transcriptomics','metabolomics','protein','model','hardware']) assert(workflow.includes(`            ${slug} \\`));
  console.log(`Dry Lab checks passed: 5 ordered chapters, 3 empty pages, ${figures} unchanged figures, ${tables} tables, 333 ranked transcripts and 9 ODEs.`);
} finally {
  await server.close();
}
