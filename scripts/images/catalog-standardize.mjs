#!/usr/bin/env node

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

import OpenAI from 'openai';
import sharp from 'sharp';
import ts from 'typescript';

const PROJECT_ROOT = process.cwd();
const DATA_FILE = path.join(PROJECT_ROOT, 'src/app/data/equipamentos-data.ts');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const TMP_ROOT = path.join(PROJECT_ROOT, 'tmp/catalog-images');
const INGEST_ROOT = path.join(TMP_ROOT, 'ingest');
const ENHANCED_ROOT = path.join(TMP_ROOT, 'enhanced');
const REPORTS_ROOT = path.join(TMP_ROOT, 'reports');
const MANIFEST_FILE = path.join(REPORTS_ROOT, 'manifest.json');
const DRY_RUN_MANIFEST_FILE = path.join(REPORTS_ROOT, 'manifest.dry-run.json');
const FINAL_PUBLIC_ROOT = path.join(PUBLIC_DIR, 'imagens/equipamentos/catalogo');
const FINAL_WEB_ROOT = '/imagens/equipamentos/catalogo';
const MEGA_LOGO_COLOR_PATH = path.join(PUBLIC_DIR, 'logo-mega-equipamentos.png');
const MEGA_LOGO_WHITE_PATH = path.join(PUBLIC_DIR, 'logo-mega-equipamentos-branca.png');
const MEGA_LOGO_BLACK_PATH = path.join(PUBLIC_DIR, 'logo-mega-equipamentos-preto.png');
const TARGET_WIDTH = 1536;
const TARGET_HEIGHT = 1024;
const TARGET_SIZE = `${TARGET_WIDTH}x${TARGET_HEIGHT}`;
const BACKGROUND_COLOR = { r: 244, g: 245, b: 247, alpha: 1 };
const INNER_SCALE = 0.78;
const DIFF_REJECT_THRESHOLD = 0.42;
const OUTPUT_COMPRESSION = 82;
const DEFAULT_MODE = 'all';
const DEFAULT_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';
const DEFAULT_RESPONSE_MODEL = process.env.OPENAI_MODEL || 'gpt-5-nano';
const DEFAULT_AI_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.OPENAI_IMAGE_EDIT_CONCURRENCY || '3', 10) || 3
);
const MARKETPLACE_HOST_HINTS = ['mlstatic', 'mercadolivre', 'olx', 'shopee', 'amazon'];

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
};

const EDIT_PROMPT = [
  'Padronize esta foto de produto para um catalogo B2B de locacao da construcao civil.',
  'Preserve exatamente o equipamento real da imagem de referencia.',
  'Se houver um objeto circulado na imagem, extraia apenas esse objeto.',
  'Nao altere modelo, formato, quantidade de pecas, cor principal, marca ou proporcoes.',
  'Melhore apenas nitidez, exposicao e limpeza visual.',
  'Recorte e centralize o equipamento em fundo neutro claro de estudio.',
  'Nao adicione pessoas, obra, sombras dramaticas, textos, logos, marca d agua, acessorios novos ou elementos inexistentes.',
  'Nao transforme a foto em render 3D ou ilustracao.',
  `Saida horizontal ${TARGET_SIZE}, pronta para catalogo web.`,
].join(' ');

function shouldApplyMegaBranding(equipamento) {
  // Verifica se o equipamento pertence às categorias que usam branding
  return equipamento.equipamentoCategoria?.id === 9 || // Reboque_e_Transporte
         equipamento.equipamentoCategoria?.id === 10;  // Diversos
}

function getMegaBrandingPrompt(equipamento) {
  if (!shouldApplyMegaBranding(equipamento)) {
    return 'Nao adicione nenhuma marca legivel ou logotipo novo.';
  }
  
  const categoriaNome = equipamento.equipamentoCategoria?.nome || '';
  let target = '';
  
  if (equipamento.equipamentoCategoria?.id === 9) {
    target = 'painel lateral ou tampa traseira do reboque';
  } else if (equipamento.equipamentoCategoria?.id === 10) {
    target = 'lateral principal do container ou modulo de apoio';
  }
  
  return `Aplique a logo Mega Equipamentos como adesivo fisico plausivel no ${target}. A logo deve parecer vinil colado na superficie do equipamento, com perspectiva, luz e desgaste natural; nunca como overlay, watermark ou grafismo solto.`;
}

loadLocalEnvFiles();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  await ensureDir(REPORTS_ROOT);

  const catalog = loadCatalog();
  const gitHeadCatalogIndex = loadGitHeadCatalogIndex();
  const previousManifestIndex = loadPreviousManifestIndex();
  const selectedEquipment = selectEquipment(catalog, options, previousManifestIndex);

  if (selectedEquipment.length === 0) {
    console.log('Nenhum equipamento correspondeu aos filtros informados.');
    return;
  }

  const openai = createImageEditState(createOpenAIClient(options), options);
  const manifest = {
    runAt: new Date().toISOString(),
    options,
    imageModel: options.imageModel,
    dryRun: options.dryRun,
    items: selectedEquipment.map((equipamento) =>
      buildManifestItem(
        equipamento,
        previousManifestIndex.get(equipamento.id),
        gitHeadCatalogIndex.get(equipamento.id)
      )
    ),
    summary: {},
  };

  const shouldEnhance = options.mode === 'all' || options.mode === 'enhance' || options.mode === 'apply';
  const shouldApply = options.mode === 'all' || options.mode === 'apply';

  await ingestImages(manifest.items);

  if (shouldEnhance) {
    await enhanceImages(manifest.items, openai, options);
  }

  if (shouldApply) {
    await applyImages(manifest.items, options);
  }

  manifest.summary = summarizeManifest(manifest.items, options);
  await fsPromises.writeFile(getManifestOutputPath(options), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  printSummary(manifest.summary);
}

function loadLocalEnvFiles() {
  if (typeof process.loadEnvFile !== 'function') {
    return;
  }

  for (const envName of ['.env.local', '.env']) {
    const envPath = path.join(PROJECT_ROOT, envName);
    if (fs.existsSync(envPath)) {
      process.loadEnvFile(envPath);
    }
  }
}

function parseArgs(argv) {
  const options = {
    mode: DEFAULT_MODE,
    limit: null,
    onlyRemote: false,
    onlyLocal: false,
    onlyFallback: false,
    dryRun: false,
    imageModel: process.env.OPENAI_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
    equipamentoId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg === '--only-remote') {
      options.onlyRemote = true;
      continue;
    }

    if (arg === '--only-local') {
      options.onlyLocal = true;
      continue;
    }

    if (arg === '--only-fallback') {
      options.onlyFallback = true;
      continue;
    }

    if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1];
      continue;
    }

    if (arg === '--mode') {
      options.mode = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith('--limit=')) {
      options.limit = Number.parseInt(arg.split('=')[1], 10);
      continue;
    }

    if (arg === '--limit') {
      options.limit = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }

    if (arg.startsWith('--equipamento-id=')) {
      options.equipamentoId = Number.parseInt(arg.split('=')[1], 10);
      continue;
    }

    if (arg === '--equipamento-id') {
      options.equipamentoId = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
  }

  return options;
}

function validateOptions(options) {
  const validModes = new Set(['all', 'ingest', 'enhance', 'apply']);
  if (!validModes.has(options.mode)) {
    throw new Error(`Modo invalido: ${options.mode}. Use all, ingest, enhance ou apply.`);
  }

  if (options.onlyRemote && options.onlyLocal) {
    throw new Error('Use apenas um filtro por vez: --only-remote ou --only-local.');
  }

  if (options.onlyFallback && (options.onlyRemote || options.onlyLocal)) {
    throw new Error('Use --only-fallback sozinho, sem combinar com --only-remote ou --only-local.');
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('O valor de --limit precisa ser um inteiro maior que zero.');
  }

  if (options.equipamentoId !== null && (!Number.isInteger(options.equipamentoId) || options.equipamentoId < 1)) {
    throw new Error('O valor de --equipamento-id precisa ser um inteiro maior que zero.');
  }
}

function createOpenAIClient(options) {
  if (options.mode === 'ingest') {
    return null;
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

function createImageEditState(client, options) {
  return {
    client,
    enabled: Boolean(client),
    skipWarning: client ? null : 'openai-image-edit-skipped',
    hasLoggedDisablement: false,
    responseModel: process.env.OPENAI_MODEL || DEFAULT_RESPONSE_MODEL,
    imageModel: options.imageModel,
  };
}

function loadPreviousManifestIndex() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return new Map();
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    const items = Array.isArray(manifest.items) ? manifest.items : [];
    return new Map(items.map((item) => [item.equipamentoId, item]));
  } catch {
    return new Map();
  }
}

function getManifestOutputPath(options) {
  return options.dryRun ? DRY_RUN_MANIFEST_FILE : MANIFEST_FILE;
}

function loadCatalog() {
  const exports = loadTsModule(DATA_FILE);
  if (!Array.isArray(exports.equipamentosData)) {
    throw new Error('Nao foi possivel carregar equipamentosData.');
  }

  return exports.equipamentosData;
}

function loadTsModule(filePath, cache = new Map()) {
  const resolvedPath = resolveTsSpecifier(path.dirname(filePath), `./${path.basename(filePath)}`);
  const source = fs.readFileSync(resolvedPath, 'utf8');
  return evaluateTsModuleSource(source, resolvedPath, cache);
}

function evaluateTsModuleSource(source, resolvedPath, cache = new Map()) {
  if (cache.has(resolvedPath)) {
    return cache.get(resolvedPath).exports;
  }
  const compiled = ts.transpileModule(source, {
    compilerOptions: COMPILER_OPTIONS,
    fileName: resolvedPath,
  }).outputText;

  const module = { exports: {} };
  cache.set(resolvedPath, module);

  const dirname = path.dirname(resolvedPath);
  const localRequire = (specifier) => {
    if (specifier.startsWith('.')) {
      return loadTsModule(resolveTsSpecifier(dirname, specifier), cache);
    }

    return createRequire(resolvedPath)(specifier);
  };

  const evaluator = new vm.Script(
    `(function (exports, require, module, __filename, __dirname) { ${compiled}\n})`,
    { filename: resolvedPath }
  );

  evaluator.runInThisContext()(module.exports, localRequire, module, resolvedPath, dirname);
  return module.exports;
}

function loadGitHeadCatalogIndex() {
  try {
    const gitRelativePath = toProjectRelativePath(DATA_FILE);
    const headSource = execFileSync('git', ['show', `HEAD:${gitRelativePath}`], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    const exports = evaluateTsModuleSource(headSource, DATA_FILE);
    if (!Array.isArray(exports.equipamentosData)) {
      return new Map();
    }

    return new Map(exports.equipamentosData.map((equipamento) => [equipamento.id, equipamento]));
  } catch {
    return new Map();
  }
}

function resolveTsSpecifier(baseDir, specifier) {
  const directPath = path.resolve(baseDir, specifier);
  const candidates = [
    directPath,
    `${directPath}.ts`,
    `${directPath}.mts`,
    path.join(directPath, 'index.ts'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Nao foi possivel resolver o modulo TypeScript: ${specifier}`);
}

function selectEquipment(catalog, options, previousManifestIndex = new Map()) {
  let filtered = catalog.filter((equipamento) => {
    const previousManifestItem = previousManifestIndex.get(equipamento.id);
    const artifactState = inspectImageArtifacts(equipamento);

    if (options.equipamentoId !== null) {
      return equipamento.id === options.equipamentoId;
    }

    if (options.onlyFallback) {
      const pendingFallbackRetry =
        previousManifestItem?.strategy === 'sharp-fallback' ||
        (artifactState.normalizedExists && !artifactState.aiExists);
      const pendingAiApply =
        artifactState.aiExists && (!artifactState.finalExists || !artifactState.finalMatchesAi);
      return pendingFallbackRetry || pendingAiApply;
    }

    const sourceType = classifyAvatarSource(equipamento.avatar);
    if (options.onlyRemote) {
      return sourceType === 'remote';
    }

    if (options.onlyLocal) {
      return sourceType === 'local';
    }

    return sourceType !== 'missing';
  });

  filtered = filtered.sort((left, right) => left.id - right.id);

  if (options.limit !== null) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

function buildManifestItem(equipamento, previousManifestItem, gitHeadCatalogItem) {
  const preferredSource = previousManifestItem?.originalSource || gitHeadCatalogItem?.avatar || equipamento.avatar;
  const sourceType = classifyAvatarSource(preferredSource);
  const artifactState = inspectImageArtifacts(equipamento);
  const warnings = [];

  if (sourceType === 'local' && preferredSource && !preferredSource.startsWith('/')) {
    warnings.push('relative-avatar-path-corrected');
  }

  if (sourceType === 'remote') {
    warnings.push('external-source-review-recommended');

    if (looksLikeMarketplaceUrl(preferredSource)) {
      warnings.push('possible-watermark-review');
    }
  }

  return {
    equipamentoId: equipamento.id,
    slug: equipamento.slug,
    nome: equipamento.nome,
    categoriaSlug: equipamento.equipamentoCategoria.slug,
    categoriaId: equipamento.equipamentoCategoria.id,
    sourceType,
    originalSource: preferredSource,
    currentAvatar: equipamento.avatar,
    ingestPath: null,
    normalizedPath: artifactState.normalizedExists ? artifactState.normalizedPath : null,
    aiPath: artifactState.aiExists ? artifactState.aiPath : null,
    chosenPath: null,
    finalPath: buildFinalWebPath(equipamento),
    strategy: 'unchanged',
    status: 'pending',
    warnings,
    driftScore: null,
    error: null,
    reuseExistingAi:
      artifactState.aiExists && (!artifactState.finalExists || !artifactState.finalMatchesAi),
  };
}

function inspectImageArtifacts(equipamento) {
  const normalizedAbsolutePath = path.join(ENHANCED_ROOT, equipamento.equipamentoCategoria.slug, `${equipamento.slug}.webp`);
  const aiAbsolutePath = path.join(ENHANCED_ROOT, equipamento.equipamentoCategoria.slug, `${equipamento.slug}.ai.webp`);
  const finalAbsolutePath = path.join(
    FINAL_PUBLIC_ROOT,
    equipamento.equipamentoCategoria.slug,
    `${equipamento.slug}.webp`
  );
  const normalizedExists = fs.existsSync(normalizedAbsolutePath);
  const aiExists = fs.existsSync(aiAbsolutePath);
  const finalExists = fs.existsSync(finalAbsolutePath);

  return {
    normalizedExists,
    aiExists,
    finalExists,
    normalizedPath: toProjectRelativePath(normalizedAbsolutePath),
    aiPath: toProjectRelativePath(aiAbsolutePath),
    finalPath: toProjectRelativePath(finalAbsolutePath),
    finalMatchesAi: aiExists && finalExists ? filesMatch(finalAbsolutePath, aiAbsolutePath) : false,
  };
}

function filesMatch(leftPath, rightPath) {
  try {
    const leftStat = fs.statSync(leftPath);
    const rightStat = fs.statSync(rightPath);

    if (leftStat.size !== rightStat.size) {
      return false;
    }

    return fs.readFileSync(leftPath).equals(fs.readFileSync(rightPath));
  } catch {
    return false;
  }
}

function classifyAvatarSource(avatar) {
  if (!avatar || typeof avatar !== 'string') {
    return 'missing';
  }

  if (/^https?:\/\//i.test(avatar)) {
    return 'remote';
  }

  if (avatar.startsWith('/') || avatar.startsWith('imagens/')) {
    return 'local';
  }

  return 'missing';
}

function looksLikeMarketplaceUrl(url) {
  if (!url) {
    return false;
  }

  return MARKETPLACE_HOST_HINTS.some((hostHint) => url.toLowerCase().includes(hostHint));
}

async function ingestImages(items) {
  console.log(`Iniciando ingestao de ${items.length} imagem(ns)...`);

  for (const item of items) {
    if (item.reuseExistingAi && item.aiPath) {
      item.chosenPath = item.aiPath;
      item.strategy = 'ai';
      item.status = 'ingested';
      item.warnings.push('reused-existing-ai-asset');
      continue;
    }

    try {
      const ingestResult = await prepareSourceImage(item);
      item.ingestPath = ingestResult.ingestPath;
      item.status = 'ingested';
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
      item.warnings.push('source-ingest-failed');
      console.warn(`  - ${item.slug}: falha na ingestao (${item.error})`);
    }
  }
}

async function prepareSourceImage(item) {
  const absoluteTargetDir = path.join(INGEST_ROOT, item.categoriaSlug);
  await ensureDir(absoluteTargetDir);

  const sourceBuffer = await loadSourceBuffer(item);
  const rotated = sharp(sourceBuffer).rotate();
  const metadata = await rotated.metadata();
  const format = normalizeSharpFormat(metadata.format);
  const extension = format === 'jpeg' ? 'jpg' : format;
  const absoluteOutputPath = path.join(absoluteTargetDir, `${item.slug}.${extension}`);

  await writeNormalizedSource(rotated, absoluteOutputPath, format);

  return {
    ingestPath: toProjectRelativePath(absoluteOutputPath),
  };
}

async function loadSourceBuffer(item) {
  try {
    return await readSourceBuffer(item.originalSource);
  } catch (error) {
    if (item.currentAvatar && item.currentAvatar !== item.originalSource) {
      item.warnings.push('primary-source-failed-used-current-avatar');
      return readSourceBuffer(item.currentAvatar);
    }

    throw error;
  }
}

async function readSourceBuffer(source) {
  if (/^https?:\/\//i.test(source)) {
    return downloadImage(source);
  }

  return readLocalImageFromPath(source);
}

async function downloadImage(sourceUrl) {
  const response = await fetch(sourceUrl, {
    redirect: 'follow',
    headers: {
      'user-agent': 'MegaEquipamentosImagePipeline/1.0',
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`download falhou com status ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

async function readLocalImageFromPath(sourcePath) {
  const relativePublicPath = sourcePath.startsWith('/') ? sourcePath.slice(1) : sourcePath;
  const absolutePath = path.join(PUBLIC_DIR, relativePublicPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`arquivo local nao encontrado: ${relativePublicPath}`);
  }

  return fsPromises.readFile(absolutePath);
}

function normalizeSharpFormat(format) {
  if (format === 'jpeg' || format === 'png' || format === 'webp') {
    return format;
  }

  if (format === 'jpg') {
    return 'jpeg';
  }

  return 'png';
}

async function writeNormalizedSource(rotatedImage, outputPath, format) {
  if (format === 'jpeg') {
    await rotatedImage.jpeg({ quality: 92, mozjpeg: true }).toFile(outputPath);
    return;
  }

  if (format === 'webp') {
    await rotatedImage.webp({ quality: 92 }).toFile(outputPath);
    return;
  }

  await rotatedImage.png().toFile(outputPath);
}

async function enhanceImages(items, openaiState, options) {
  console.log('Padronizando e melhorando imagens...');

  const eligibleItems = items.filter((item) => item.status !== 'failed' && (item.ingestPath || item.aiPath));
  let cursor = 0;
  const workerCount = Math.min(DEFAULT_AI_CONCURRENCY, eligibleItems.length || 1);

  const worker = async () => {
    while (cursor < eligibleItems.length) {
      const item = eligibleItems[cursor];
      cursor += 1;
      await enhanceSingleItem(item, openaiState, options);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

function shouldDisableImageEdit(warning) {
  return (
    warning.startsWith('openai-edit-failed:401') ||
    warning.startsWith('openai-edit-failed:403')
  );
}

async function enhanceSingleItem(item, openaiState, options) {
  if (item.status === 'failed' || (!item.ingestPath && !item.aiPath)) {
    return;
  }

  if (item.reuseExistingAi && item.aiPath && !item.ingestPath) {
    item.chosenPath = item.aiPath;
    item.strategy = 'ai';
    item.status = 'enhanced';
    return;
  }

  try {
    const ingestAbsolutePath = fromProjectRelativePath(item.ingestPath);
    const normalizedAbsolutePath = path.join(ENHANCED_ROOT, item.categoriaSlug, `${item.slug}.webp`);
    await ensureDir(path.dirname(normalizedAbsolutePath));

    await createDeterministicImage(ingestAbsolutePath, normalizedAbsolutePath);
    item.normalizedPath = toProjectRelativePath(normalizedAbsolutePath);
    item.chosenPath = item.normalizedPath;
    item.strategy = 'sharp-fallback';
    item.status = 'enhanced';

    if (!openaiState.client || !openaiState.enabled) {
      item.warnings.push(openaiState.skipWarning || 'openai-image-edit-skipped');
      return;
    }

    const aiAbsolutePath = path.join(ENHANCED_ROOT, item.categoriaSlug, `${item.slug}.ai.webp`);
    const aiResult = await tryOpenAIEdit({
      openai: openaiState.client,
      responseModel: openaiState.responseModel,
      item,
      ingestAbsolutePath,
      normalizedAbsolutePath,
      aiAbsolutePath,
      imageModel: options.imageModel,
    });

    if (aiResult.accepted) {
      item.aiPath = toProjectRelativePath(aiAbsolutePath);
      item.chosenPath = item.aiPath;
      item.strategy = 'ai';
      item.driftScore = aiResult.driftScore;
    } else if (aiResult.warning) {
      item.warnings.push(aiResult.warning);
      item.driftScore = aiResult.driftScore;

      if (shouldDisableImageEdit(aiResult.warning)) {
        openaiState.enabled = false;
        openaiState.skipWarning = 'openai-image-edit-disabled-after-capability-check';

        if (!openaiState.hasLoggedDisablement) {
          console.log('OpenAI Image Edit indisponivel para esta conta; seguindo com fallback local.');
          openaiState.hasLoggedDisablement = true;
        }
      }
    }
  } catch (error) {
    item.status = 'failed';
    item.error = error instanceof Error ? error.message : String(error);
    item.warnings.push('enhancement-failed');
    console.warn(`  - ${item.slug}: falha ao padronizar (${item.error})`);
  }
}

async function createDeterministicImage(sourcePath, outputPath) {
  const innerWidth = Math.round(TARGET_WIDTH * INNER_SCALE);
  const innerHeight = Math.round(TARGET_HEIGHT * INNER_SCALE);
  const resizedInput = await sharp(sourcePath)
    .rotate()
    .resize({
      width: innerWidth,
      height: innerHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: TARGET_WIDTH,
      height: TARGET_HEIGHT,
      channels: 4,
      background: BACKGROUND_COLOR,
    },
  })
    .composite([{ input: resizedInput, gravity: 'center' }])
    .webp({ quality: OUTPUT_COMPRESSION })
    .toFile(outputPath);
}

async function tryOpenAIEdit({
  openai,
  responseModel,
  item,
  ingestAbsolutePath,
  normalizedAbsolutePath,
  aiAbsolutePath,
  imageModel,
}) {
  try {
    const inputImageDataUrl = await buildDataUrlFromImage(ingestAbsolutePath);
    const result = await openai.responses.create(
      {
        model: responseModel,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${EDIT_PROMPT} ${getMegaBrandingPrompt(item)} Equipamento: ${item.nome}. Categoria: ${item.categoriaSlug}.`,
              },
              {
                type: 'input_image',
                image_url: inputImageDataUrl,
                detail: 'high',
              },
            ],
          },
        ],
        tools: [
          {
            type: 'image_generation',
            action: 'edit',
            model: imageModel,
            size: TARGET_SIZE,
            quality: 'medium',
            output_format: 'webp',
            output_compression: OUTPUT_COMPRESSION,
            input_fidelity: 'high',
            background: 'opaque',
          },
        ],
        tool_choice: {
          type: 'allowed_tools',
          mode: 'required',
          tools: [{ type: 'image_generation' }],
        },
      },
      { timeout: 180000 }
    );

    const imageGenerationCall = result.output?.find((outputItem) => outputItem.type === 'image_generation_call');
    const b64Image = imageGenerationCall?.result;
    if (!b64Image) {
      return {
        accepted: false,
        warning: 'openai-returned-empty-image',
      };
    }

    const aiBuffer = Buffer.from(b64Image, 'base64');
    await sharp(aiBuffer).metadata();
    await sharp(aiBuffer).webp({ quality: OUTPUT_COMPRESSION }).toFile(aiAbsolutePath);

    const driftScore = await computeDriftScore(normalizedAbsolutePath, aiAbsolutePath);
    if (driftScore > DIFF_REJECT_THRESHOLD) {
      await fsPromises.rm(aiAbsolutePath, { force: true });
      return {
        accepted: false,
        warning: 'openai-output-too-different',
        driftScore,
      };
    }

    return {
      accepted: true,
      driftScore,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      accepted: false,
      warning: `openai-edit-failed:${message}`,
    };
  }
}

async function buildDataUrlFromImage(imagePath) {
  const imageBuffer = await fsPromises.readFile(imagePath);
  const metadata = await sharp(imageBuffer).metadata();
  const format = normalizeSharpFormat(metadata.format);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
}

async function computeDriftScore(referencePath, candidatePath) {
  const [reference, candidate] = await Promise.all([
    createDiffFingerprint(referencePath),
    createDiffFingerprint(candidatePath),
  ]);

  let diffTotal = 0;
  for (let index = 0; index < reference.length; index += 1) {
    diffTotal += Math.abs(reference[index] - candidate[index]);
  }

  return Number((diffTotal / (reference.length * 255)).toFixed(4));
}

async function createDiffFingerprint(imagePath) {
  return sharp(imagePath)
    .removeAlpha()
    .resize(64, 64, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
}

async function applyImages(items, options) {
  console.log(options.dryRun ? 'Simulando aplicacao no catalogo...' : 'Aplicando imagens ao catalogo...');

  const avatarUpdates = new Map();

  for (const item of items) {
    if (item.status === 'failed' || !item.chosenPath) {
      continue;
    }

    const sourcePath = fromProjectRelativePath(item.chosenPath);
    const absoluteFinalPath = path.join(FINAL_PUBLIC_ROOT, item.categoriaSlug, `${item.slug}.webp`);

    if (!options.dryRun) {
      await ensureDir(path.dirname(absoluteFinalPath));
      await fsPromises.copyFile(sourcePath, absoluteFinalPath);
    }

    avatarUpdates.set(item.equipamentoId, buildFinalWebPath(item));
    item.status = options.dryRun ? 'ready-to-apply' : 'applied';
  }

  if (options.dryRun || avatarUpdates.size === 0) {
    return;
  }

  const sourceText = await fsPromises.readFile(DATA_FILE, 'utf8');
  const updatedSource = rewriteAvatarValues(sourceText, avatarUpdates);

  if (sourceText !== updatedSource) {
    await fsPromises.writeFile(DATA_FILE, updatedSource, 'utf8');
  }
}

function buildFinalWebPath(item) {
  if ('equipamentoCategoria' in item) {
    return `${FINAL_WEB_ROOT}/${item.equipamentoCategoria.slug}/${item.slug}.webp`;
  }

  return `${FINAL_WEB_ROOT}/${item.categoriaSlug}/${item.slug}.webp`;
}

function rewriteAvatarValues(sourceText, avatarUpdates) {
  const sourceFile = ts.createSourceFile(DATA_FILE, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const replacements = [];

  const visit = (node) => {
    if (!ts.isVariableDeclaration(node) || node.name.getText(sourceFile) !== 'equipamentosData') {
      ts.forEachChild(node, visit);
      return;
    }

    if (!node.initializer || !ts.isArrayLiteralExpression(node.initializer)) {
      return;
    }

    for (const element of node.initializer.elements) {
      if (!ts.isObjectLiteralExpression(element)) {
        continue;
      }

      const idProperty = findProperty(element, 'id');
      const avatarProperty = findProperty(element, 'avatar');
      if (!idProperty || !avatarProperty || !ts.isPropertyAssignment(avatarProperty)) {
        continue;
      }

      const equipamentoId = readNumericLiteral(idProperty.initializer);
      if (equipamentoId === null || !avatarUpdates.has(equipamentoId)) {
        continue;
      }

      replacements.push({
        start: avatarProperty.initializer.getStart(sourceFile),
        end: avatarProperty.initializer.getEnd(),
        value: singleQuoteLiteral(avatarUpdates.get(equipamentoId)),
      });
    }
  };

  ts.forEachChild(sourceFile, visit);

  return replacements
    .sort((left, right) => right.start - left.start)
    .reduce(
      (updatedSource, replacement) =>
        `${updatedSource.slice(0, replacement.start)}${replacement.value}${updatedSource.slice(replacement.end)}`,
      sourceText
    );
}

function findProperty(objectLiteral, propertyName) {
  return objectLiteral.properties.find((property) => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }

    return readPropertyName(property.name) === propertyName;
  });
}

function readPropertyName(propertyName) {
  if (ts.isIdentifier(propertyName) || ts.isStringLiteral(propertyName)) {
    return propertyName.text;
  }

  return null;
}

function readNumericLiteral(node) {
  if (ts.isNumericLiteral(node)) {
    return Number.parseInt(node.text, 10);
  }

  return null;
}

function singleQuoteLiteral(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function summarizeManifest(items, options) {
  const summary = {
    selected: items.length,
    remoteSources: 0,
    localSources: 0,
    failed: 0,
    applied: 0,
    readyToApply: 0,
    ai: 0,
    sharpFallback: 0,
    unchanged: 0,
    dryRun: options.dryRun,
    mode: options.mode,
  };

  for (const item of items) {
    if (item.sourceType === 'remote') {
      summary.remoteSources += 1;
    }

    if (item.sourceType === 'local') {
      summary.localSources += 1;
    }

    if (item.status === 'failed') {
      summary.failed += 1;
    }

    if (item.status === 'applied') {
      summary.applied += 1;
    }

    if (item.status === 'ready-to-apply') {
      summary.readyToApply += 1;
    }

    if (item.strategy === 'ai') {
      summary.ai += 1;
    } else if (item.strategy === 'sharp-fallback') {
      summary.sharpFallback += 1;
    } else {
      summary.unchanged += 1;
    }
  }

  return summary;
}

function printSummary(summary) {
  console.log('\nResumo do pipeline');
  console.log(`- selecionados: ${summary.selected}`);
  console.log(`- fontes remotas: ${summary.remoteSources}`);
  console.log(`- fontes locais: ${summary.localSources}`);
  console.log(`- IA aplicada: ${summary.ai}`);
  console.log(`- fallback sharp: ${summary.sharpFallback}`);
  console.log(`- falhas: ${summary.failed}`);

  if (summary.dryRun) {
    console.log(`- prontos para aplicar: ${summary.readyToApply}`);
    console.log(`- manifesto: ${toProjectRelativePath(DRY_RUN_MANIFEST_FILE)}`);
    return;
  }

  console.log(`- aplicados: ${summary.applied}`);
  console.log(`- manifesto: ${toProjectRelativePath(MANIFEST_FILE)}`);
}

function toProjectRelativePath(absolutePath) {
  return path.relative(PROJECT_ROOT, absolutePath);
}

function fromProjectRelativePath(projectRelativePath) {
  return path.join(PROJECT_ROOT, projectRelativePath);
}

async function ensureDir(targetDir) {
  await fsPromises.mkdir(targetDir, { recursive: true });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
