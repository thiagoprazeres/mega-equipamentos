import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const runtimePath = resolve(
  'node_modules/@netlify/angular-runtime/src/helpers/setUpEdgeFunction.js',
);
const source = readFileSync(runtimePath, 'utf8');
const needle = "const excludedPaths = ['/.netlify/*', ...staticFiles,";
const replacement = "const excludedPaths = ['/.netlify/*', '/api/*', ...staticFiles,";

if (!source.includes(replacement)) {
  if (!source.includes(needle)) {
    throw new Error('Não foi possível localizar o ponto de patch do Angular Runtime.');
  }

  writeFileSync(runtimePath, source.replace(needle, replacement));
}
