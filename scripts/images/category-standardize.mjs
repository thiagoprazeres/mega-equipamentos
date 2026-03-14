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

import { categoryCoverConfigBySlug } from './category-cover-config.mjs';

const PROJECT_ROOT = process.cwd();
const CATEGORY_DATA_FILE = path.join(PROJECT_ROOT, 'src/app/data/equipamentos-categorias-data.ts');
const EQUIPMENT_DATA_FILE = path.join(PROJECT_ROOT, 'src/app/data/equipamentos-data.ts');
const CATEGORY_ENUM_FILE = path.join(PROJECT_ROOT, 'src/app/enums/equipamentos-categorias-id.ts');
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const MEGA_LOGO_COLOR_PATH = path.join(PUBLIC_DIR, 'logo-mega-equipamentos.png');
const MEGA_LOGO_WHITE_PATH = path.join(PUBLIC_DIR, 'logo-mega-equipamentos-branca.png');
const MEGA_LOGO_BLACK_PATH = path.join(PUBLIC_DIR, 'logo-mega-equipamentos-preto.png');
const TMP_ROOT = path.join(PROJECT_ROOT, 'tmp/category-images');
const INGEST_ROOT = path.join(TMP_ROOT, 'ingest');
const COMPOSE_ROOT = path.join(TMP_ROOT, 'compose');
const REPORTS_ROOT = path.join(TMP_ROOT, 'reports');
const MANIFEST_FILE = path.join(REPORTS_ROOT, 'manifest.json');
const DRY_RUN_MANIFEST_FILE = path.join(REPORTS_ROOT, 'manifest.dry-run.json');
const FINAL_PUBLIC_ROOT = path.join(PUBLIC_DIR, 'imagens/categorias');
const FINAL_WEB_ROOT = '/imagens/categorias';

const MASTER_WIDTH = 1536;
const MASTER_HEIGHT = 1024;
const HERO_WIDTH = 1600;
const HERO_HEIGHT = 900;
const CARD_WIDTH = 1200;
const CARD_HEIGHT = 900;
const OUTPUT_COMPRESSION = 84;
const MASTER_SIZE = `${MASTER_WIDTH}x${MASTER_HEIGHT}`;
const DEFAULT_MODE = 'all';
const DEFAULT_RESPONSE_MODEL = process.env.OPENAI_CATEGORY_RESPONSE_MODEL || 'gpt-5';
const DEFAULT_IMAGE_MODEL = process.env.OPENAI_CATEGORY_IMAGE_MODEL || 'gpt-image-1.5';
const DEFAULT_IMAGE_MODEL_FALLBACK =
  process.env.OPENAI_IMAGE_MODEL ||
  (DEFAULT_IMAGE_MODEL === 'gpt-image-1.5' ? 'gpt-image-1' : DEFAULT_IMAGE_MODEL);
const DEFAULT_REVIEW_MODEL = process.env.OPENAI_CATEGORY_REVIEW_MODEL || 'gpt-5';
const DEFAULT_AI_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.OPENAI_CATEGORY_IMAGE_CONCURRENCY || '2', 10) || 2,
);
const ALLOW_REUSE_EXISTING_AI = process.env.OPENAI_CATEGORY_REUSE_EXISTING_AI === '1';
const DIFF_REJECT_THRESHOLD = 0.62;
const CATEGORY_SOURCE_BACKGROUND = { r: 244, g: 245, b: 247, alpha: 1 };

const PALETTES = [
  { base: '#0d223d', accent: '#2a6db2', warm: '#f6a53d', grid: '#ffffff1c' },
  { base: '#1a2434', accent: '#315f95', warm: '#f3b04c', grid: '#ffffff18' },
  { base: '#1d2a33', accent: '#326c78', warm: '#f0a64b', grid: '#ffffff16' },
  { base: '#1b1d29', accent: '#38658a', warm: '#e9a948', grid: '#ffffff18' },
];

const COMPILER_OPTIONS = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
};

const CATEGORY_PROMPT = [
  'Crie uma capa editorial comercial para uma categoria de locacao de equipamentos da construcao civil.',
  'Crie uma unica imagem full-bleed com cara de fotografia real de obra, nao uma grade, colagem, moodboard, layout de cards ou vitrine de catalogo.',
  'O resultado precisa parecer uma situacao real de uso, com operadores em acao e nao equipamento parado para foto.',
  'A cena deve mostrar uso humano evidente do equipamento principal: operar, ajustar, monitorar, carregar, içar, compactar, vibrar, perfurar, cortar, demolir, rebocar, abrir ou organizar, conforme a categoria.',
  'Use apenas os equipamentos presentes nas imagens de referencia.',
  'Preserve o formato, a cor principal, a proporcao e a identidade visual dos equipamentos.',
  'Mostre com clareza o equipamento principal em uso real; equipamentos de apoio podem aparecer discretamente apenas se ajudarem no realismo.',
  'Inclua trabalhadores com EPI completo, postura natural e gesto coerente com a acao descrita.',
  'Pelo menos uma pessoa deve aparecer interagindo fisicamente com o equipamento principal ou operando-o de forma visivel e crivel.',
  'A cena deve ter contexto de obra real, limpo e comercial, sem adicionar novos equipamentos.',
  'Nao adicione mockup, interface, cartoes, paineis, letras, numeros, letreiros, marcas, logos, textos ou marca d agua.',
  'Nao transforme os equipamentos em render 3D, ilustracao ou objeto diferente.',
  'Nao mostre nomes de marca, letras ou numeros visiveis nos equipamentos.',
  'Mantenha um visual premium, limpo, realista e pronto para hero de site.',
  `Saida horizontal ${MASTER_SIZE}.`,
].join(' ');

const CATEGORY_RETRY_PROMPT = [
  'Refaca como uma foto hero realista e cinematografica de canteiro de obra com operadores em atividade visivel.',
  'O foco deve ser o momento de uso do equipamento principal, nunca uma apresentacao estatica de produto.',
  'Se nao houver corpo, maos, postura e gesto humano coerentes com a operacao, a imagem esta errada.',
  'Nao produza grade, colagem, cards, paineis, mockup, catalogo, interface, still life ou split screen.',
  'Nao escreva palavras, siglas, numeros, logos ou textos em nenhum lugar da imagem, exceto quando a regra de branding da Mega for explicitamente permitida.',
  'Use o equipamento principal exatamente como referencia e mantenha os apoios apenas se forem discretos e coerentes.',
  'Se houver estruturas de apoio ou fundo, elas devem reforcar o uso humano e nao competir com o equipamento.',
].join(' ');

const REVIEW_PROMPT = [
  'Avalie se a imagem candidata e uma capa hero humanizada de uso real para a categoria.',
  'Aprovacao somente se houver uso humano visivel e convincente do equipamento principal, nao apenas contexto sugestivo.',
  'Se nao houver pelo menos um operador claramente presente ou interagindo com o equipamento principal, rejeite.',
  'Se os trabalhadores estiverem sem EPI coerente com a acao, rejeite.',
  'Rejeite se a imagem parecer grade, colagem, layout de cards, mockup, interface, still life, vitrine ou catalogo.',
  'Rejeite se o equipamento principal estiver parado, posado ou encostado sem acao humana convincente.',
  'Rejeite se houver texto, watermark, produto inventado, logotipo indevido ou descaracterizacao do equipamento.',
  'Quando branding Mega for exigido, aprove somente se a logo estiver aplicada como adesivo fisico plausivel no equipamento, nao como overlay ou watermark.',
  'Responda somente com JSON no formato {"approved": boolean, "hasHumanUsage": boolean, "hasPpe": boolean, "looksCatalog": boolean, "brandingPlausible": boolean|null, "primaryEquipmentMatches": boolean, "inventedEquipment": boolean, "textOrWatermark": boolean, "issueCodes": string[], "issues": string[]}.',
].join(' ');

loadLocalEnvFiles();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  await ensureDir(REPORTS_ROOT);

  const categories = loadCategories();
  const equipment = loadEquipmentCatalog();
  const categoryEnum = loadCategoryEnum();
  const previousManifestIndex = loadPreviousManifestIndex();
  const gitHeadCategoryIndex = loadGitHeadCategoryIndex();
  const equipmentBySlug = new Map(equipment.map((item) => [item.slug, item]));
  const selectedCategories = selectCategories(categories, options, previousManifestIndex);

  if (selectedCategories.length === 0) {
    console.log('Nenhuma categoria correspondeu aos filtros informados.');
    return;
  }

  const openaiState = createOpenAIState(createOpenAIClient(options), options);
  const manifest = {
    runAt: new Date().toISOString(),
    options,
    responseModel: options.responseModel,
    imageModel: options.imageModel,
    reviewModel: options.reviewModel,
    dryRun: options.dryRun,
    items: selectedCategories.map((categoria) =>
      buildManifestItem(
        categoria,
        categoryCoverConfigBySlug.get(categoria.slug),
        previousManifestIndex.get(categoria.id),
        gitHeadCategoryIndex.get(categoria.id),
      ),
    ),
    summary: {},
  };

  const shouldCompose =
    options.mode === 'all' || options.mode === 'compose' || options.mode === 'apply';
  const shouldApply = options.mode === 'all' || options.mode === 'apply';

  await ingestSources(manifest.items, equipmentBySlug);

  if (shouldCompose) {
    await composeCategories(manifest.items, openaiState, options);
  }

  if (shouldApply) {
    await applyCategories(manifest.items, categories, categoryEnum, options);
  }

  manifest.summary = summarizeManifest(manifest.items, options);
  await fsPromises.writeFile(
    getManifestOutputPath(options),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

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
    responseModel: DEFAULT_RESPONSE_MODEL,
    imageModel: DEFAULT_IMAGE_MODEL,
    reviewModel: DEFAULT_REVIEW_MODEL,
    categoriaId: null,
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
    }

    if (arg.startsWith('--categoria-id=')) {
      options.categoriaId = Number.parseInt(arg.split('=')[1], 10);
      continue;
    }

    if (arg === '--categoria-id') {
      options.categoriaId = Number.parseInt(argv[index + 1], 10);
      index += 1;
      continue;
    }
  }

  return options;
}

function validateOptions(options) {
  const validModes = new Set(['all', 'ingest', 'compose', 'apply']);
  if (!validModes.has(options.mode)) {
    throw new Error(`Modo invalido: ${options.mode}. Use all, ingest, compose ou apply.`);
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

  if (options.categoriaId !== null && (!Number.isInteger(options.categoriaId) || options.categoriaId < 1)) {
    throw new Error('O valor de --categoria-id precisa ser um inteiro maior que zero.');
  }
}

function createOpenAIClient(options) {
  if (options.mode === 'ingest' || !process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function createOpenAIState(client, options) {
  return {
    client,
    enabled: Boolean(client),
    skipWarning: client ? null : 'openai-category-compose-skipped',
    hasLoggedDisablement: false,
    responseModel: options.responseModel,
    reviewModel: options.reviewModel,
    imageModel: options.imageModel,
    fallbackImageModel:
      DEFAULT_IMAGE_MODEL_FALLBACK && DEFAULT_IMAGE_MODEL_FALLBACK !== options.imageModel
        ? DEFAULT_IMAGE_MODEL_FALLBACK
        : null,
  };
}

function loadPreviousManifestIndex() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return new Map();
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    const items = Array.isArray(manifest.items) ? manifest.items : [];
    return new Map(items.map((item) => [item.categoryId, item]));
  } catch {
    return new Map();
  }
}

function getManifestOutputPath(options) {
  return options.dryRun ? DRY_RUN_MANIFEST_FILE : MANIFEST_FILE;
}

function loadCategories() {
  const exports = loadTsModule(CATEGORY_DATA_FILE);
  if (!Array.isArray(exports.equipamentosCategoriasData)) {
    throw new Error('Nao foi possivel carregar equipamentosCategoriasData.');
  }

  return exports.equipamentosCategoriasData;
}

function loadEquipmentCatalog() {
  const exports = loadTsModule(EQUIPMENT_DATA_FILE);
  if (!Array.isArray(exports.equipamentosData)) {
    throw new Error('Nao foi possivel carregar equipamentosData.');
  }

  return exports.equipamentosData;
}

function loadCategoryEnum() {
  const exports = loadTsModule(CATEGORY_ENUM_FILE);
  if (!exports.EquipamentosCategoriasId) {
    throw new Error('Nao foi possivel carregar EquipamentosCategoriasId.');
  }

  return exports.EquipamentosCategoriasId;
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

  const compiled = ts.transpileModule(source, { compilerOptions: COMPILER_OPTIONS }).outputText;
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
    { filename: resolvedPath },
  );

  evaluator.runInThisContext()(module.exports, localRequire, module, resolvedPath, dirname);
  return module.exports;
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

function loadGitHeadCategoryIndex() {
  try {
    const gitRelativePath = toProjectRelativePath(CATEGORY_DATA_FILE);
    const headSource = execFileSync('git', ['show', `HEAD:${gitRelativePath}`], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const exports = evaluateTsModuleSource(headSource, CATEGORY_DATA_FILE);

    if (!Array.isArray(exports.equipamentosCategoriasData)) {
      return new Map();
    }

    return new Map(
      exports.equipamentosCategoriasData.map((categoria) => [categoria.id, categoria]),
    );
  } catch {
    return new Map();
  }
}

function selectCategories(categories, options, previousManifestIndex = new Map()) {
  let filtered = categories.filter((categoria) => {
    const previousManifestItem = previousManifestIndex.get(categoria.id);
    const artifactState = inspectCategoryArtifacts(categoria);

    if (!categoryCoverConfigBySlug.has(categoria.slug)) {
      return false;
    }

    if (options.categoriaId !== null) {
      return categoria.id === options.categoriaId;
    }

    if (options.onlyFallback) {
      const pendingFallbackRetry =
        previousManifestItem?.strategy === 'sharp-fallback' ||
        (artifactState.localMasterExists && !artifactState.aiMasterExists);
      const pendingAiApply =
        artifactState.aiMasterExists &&
        (!artifactState.finalMasterExists ||
          !artifactState.finalHeroExists ||
          !artifactState.finalCardExists ||
          !artifactState.finalMasterMatchesAi);
      return pendingFallbackRetry || pendingAiApply;
    }

    const sourceType = classifyAvatarSource(categoria.avatar);
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

function buildManifestItem(categoria, config, previousManifestItem, gitHeadCategoryItem) {
  const originalSource =
    previousManifestItem?.originalSource || gitHeadCategoryItem?.avatar || categoria.avatar;
  const sourceType = classifyAvatarSource(originalSource);
  const artifactState = inspectCategoryArtifacts(categoria);
  const warnings = [];
  const sourceEquipmentSlugs = [
    config.primaryEquipmentSlug,
    ...(config.supportEquipmentSlugs || []),
  ].filter(Boolean);

  if (sourceType === 'local' && originalSource && !originalSource.startsWith('/')) {
    warnings.push('relative-avatar-path-corrected');
  }

  if (sourceType === 'remote') {
    warnings.push('external-source-review-recommended');
  }

  return {
    categoryId: categoria.id,
    slug: categoria.slug,
    nome: categoria.nome,
    originalSource,
    sourceType,
    currentAvatar: categoria.avatar,
    primaryEquipmentSlug: config.primaryEquipmentSlug,
    supportEquipmentSlugs: config.supportEquipmentSlugs || [],
    sourceEquipmentSlugs,
    humanSceneBrief: config.humanSceneBrief,
    humanActionBrief: config.humanActionBrief,
    ppeBrief: config.ppeBrief,
    allowHumanPresence: config.allowHumanPresence !== false,
    brandingMode: config.brandingMode || 'none',
    brandingTarget: config.brandingTarget || null,
    ingestPaths: [],
    primaryIngestPath: null,
    supportIngestPaths: [],
    sourceCoverPath: null,
    sourceMasterPath: null,
    brandingAssetPath: null,
    brandingVariant: null,
    localMasterPath: artifactState.localMasterExists ? artifactState.localMasterPath : null,
    aiMasterPath: artifactState.aiMasterExists ? artifactState.aiMasterPath : null,
    chosenMasterPath: null,
    masterPath: buildFinalWebPath(categoria.slug, 'master.webp'),
    heroPath: buildFinalWebPath(categoria.slug, 'hero.webp'),
    cardPath: buildFinalWebPath(categoria.slug, 'card.webp'),
    strategy: 'unchanged',
    status: 'pending',
    warnings,
    driftScore: null,
    reviewIssueCodes: [],
    reviewIssues: [],
    error: null,
    reuseExistingAi:
      ALLOW_REUSE_EXISTING_AI &&
      artifactState.aiMasterExists &&
      (!artifactState.finalMasterExists ||
        !artifactState.finalHeroExists ||
        !artifactState.finalCardExists ||
        !artifactState.finalMasterMatchesAi),
  };
}

function inspectCategoryArtifacts(categoria) {
  const composeDir = path.join(COMPOSE_ROOT, categoria.slug);
  const finalDir = path.join(FINAL_PUBLIC_ROOT, categoria.slug);
  const localMasterAbsolutePath = path.join(composeDir, 'master.local.webp');
  const aiMasterAbsolutePath = path.join(composeDir, 'master.ai.webp');
  const finalMasterAbsolutePath = path.join(finalDir, 'master.webp');
  const finalHeroAbsolutePath = path.join(finalDir, 'hero.webp');
  const finalCardAbsolutePath = path.join(finalDir, 'card.webp');

  const localMasterExists = fs.existsSync(localMasterAbsolutePath);
  const aiMasterExists = fs.existsSync(aiMasterAbsolutePath);
  const finalMasterExists = fs.existsSync(finalMasterAbsolutePath);
  const finalHeroExists = fs.existsSync(finalHeroAbsolutePath);
  const finalCardExists = fs.existsSync(finalCardAbsolutePath);

  return {
    localMasterExists,
    aiMasterExists,
    finalMasterExists,
    finalHeroExists,
    finalCardExists,
    localMasterPath: toProjectRelativePath(localMasterAbsolutePath),
    aiMasterPath: toProjectRelativePath(aiMasterAbsolutePath),
    finalMasterPath: toProjectRelativePath(finalMasterAbsolutePath),
    finalHeroPath: toProjectRelativePath(finalHeroAbsolutePath),
    finalCardPath: toProjectRelativePath(finalCardAbsolutePath),
    finalMasterMatchesAi:
      aiMasterExists && finalMasterExists
        ? filesMatch(finalMasterAbsolutePath, aiMasterAbsolutePath)
        : false,
  };
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

async function ingestSources(items, equipmentBySlug) {
  console.log(`Iniciando ingestao de ${items.length} categoria(s)...`);

  for (const item of items) {
    if (item.reuseExistingAi && item.aiMasterPath) {
      item.chosenMasterPath = item.aiMasterPath;
      item.strategy = 'ai';
      item.status = 'ingested';
      item.warnings.push('reused-existing-ai-asset');
      continue;
    }

    try {
      const targetDir = path.join(INGEST_ROOT, item.slug);
      await ensureDir(targetDir);
      const primaryEquipment = equipmentBySlug.get(item.primaryEquipmentSlug);
      if (!primaryEquipment?.avatar) {
        throw new Error(`equipamento principal nao encontrado: ${item.primaryEquipmentSlug}`);
      }

      const primarySourceBuffer = await readLocalImageFromPath(primaryEquipment.avatar);
      const primaryOutputAbsolutePath = path.join(
        targetDir,
        `primary-${item.primaryEquipmentSlug}.webp`,
      );
      await sharp(primarySourceBuffer)
        .rotate()
        .webp({ quality: 90 })
        .toFile(primaryOutputAbsolutePath);

      const supportIngestPaths = [];
      for (const equipmentSlug of item.supportEquipmentSlugs) {
        const equipmentItem = equipmentBySlug.get(equipmentSlug);
        if (!equipmentItem?.avatar) {
          throw new Error(`equipamento de apoio nao encontrado: ${equipmentSlug}`);
        }

        const sourceBuffer = await readLocalImageFromPath(equipmentItem.avatar);
        const outputAbsolutePath = path.join(targetDir, `support-${equipmentSlug}.webp`);
        await sharp(sourceBuffer).rotate().webp({ quality: 90 }).toFile(outputAbsolutePath);
        supportIngestPaths.push(toProjectRelativePath(outputAbsolutePath));
      }

      const sourceCoverBuffer = await readSourceBuffer(item.originalSource);
      const sourceCoverAbsolutePath = path.join(targetDir, 'category-source.webp');
      await sharp(sourceCoverBuffer).rotate().webp({ quality: 90 }).toFile(sourceCoverAbsolutePath);

      item.primaryIngestPath = toProjectRelativePath(primaryOutputAbsolutePath);
      item.supportIngestPaths = supportIngestPaths;
      item.ingestPaths = [item.primaryIngestPath, ...supportIngestPaths];
      item.sourceCoverPath = toProjectRelativePath(sourceCoverAbsolutePath);
      item.status = 'ingested';
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
      item.warnings.push('source-ingest-failed');
      console.warn(`  - ${item.slug}: falha na ingestao (${item.error})`);
    }
  }
}

async function composeCategories(items, openaiState, options) {
  console.log('Compondo capas das categorias...');

  const eligibleItems = items.filter(
    (item) => item.status !== 'failed' && (item.ingestPaths.length > 0 || item.aiMasterPath),
  );
  let cursor = 0;
  const workerCount = Math.min(DEFAULT_AI_CONCURRENCY, eligibleItems.length || 1);

  const worker = async () => {
    while (cursor < eligibleItems.length) {
      const item = eligibleItems[cursor];
      cursor += 1;
      await composeSingleCategory(item, openaiState, options);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function composeSingleCategory(item, openaiState, options) {
  if (item.status === 'failed') {
    return;
  }

  console.log(`  - ${item.slug}: iniciando composicao...`);

  if (item.reuseExistingAi && item.aiMasterPath && item.ingestPaths.length === 0) {
    item.chosenMasterPath = item.aiMasterPath;
    item.strategy = 'ai';
    item.status = 'composed';
    console.log(`  - ${item.slug}: reutilizando capa IA existente.`);
    return;
  }

  try {
    const composeDir = path.join(COMPOSE_ROOT, item.slug);
    await ensureDir(composeDir);

    const sourceMasterAbsolutePath = path.join(composeDir, 'master.source.webp');
    await createSourceFallbackMaster(item.sourceCoverPath, sourceMasterAbsolutePath);
    item.sourceMasterPath = toProjectRelativePath(sourceMasterAbsolutePath);
    item.chosenMasterPath = item.sourceMasterPath;
    item.strategy = 'sharp-fallback';

    if (item.brandingMode === 'mega-decal' && item.primaryIngestPath) {
      const brandingAsset = await pickMegaBrandingAsset(
        fromProjectRelativePath(item.primaryIngestPath),
      );
      item.brandingAssetPath = toProjectRelativePath(brandingAsset.assetPath);
      item.brandingVariant = brandingAsset.variant;
    }

    const localMasterAbsolutePath = path.join(composeDir, 'master.local.webp');
    await createLocalCategoryMaster(item, localMasterAbsolutePath);

    item.localMasterPath = toProjectRelativePath(localMasterAbsolutePath);
    item.status = 'composed';

    if (!openaiState.client || !openaiState.enabled) {
      item.warnings.push(openaiState.skipWarning || 'openai-category-compose-skipped');
      console.log(`  - ${item.slug}: seguindo com fallback local.`);
      return;
    }

    const aiMasterAbsolutePath = path.join(composeDir, 'master.ai.webp');
    const aiResult = await tryOpenAICategoryEdit(
      item,
      sourceMasterAbsolutePath,
      localMasterAbsolutePath,
      aiMasterAbsolutePath,
      openaiState,
      options,
    );

    if (aiResult.accepted) {
      item.aiMasterPath = toProjectRelativePath(aiMasterAbsolutePath);
      item.chosenMasterPath = item.aiMasterPath;
      item.strategy = 'ai';
      item.driftScore = aiResult.driftScore;
      item.reviewIssueCodes = aiResult.reviewIssueCodes || [];
      item.reviewIssues = aiResult.reviewIssues;
      console.log(`  - ${item.slug}: capa IA aprovada.`);
    } else if (aiResult.warning) {
      item.warnings.push(aiResult.warning);
      item.driftScore = aiResult.driftScore;
      item.reviewIssueCodes = aiResult.reviewIssueCodes || [];
      item.reviewIssues = aiResult.reviewIssues || [];
      console.log(`  - ${item.slug}: fallback local (${aiResult.warning}).`);

      if (shouldDisableImageCompose(aiResult.warning)) {
        openaiState.enabled = false;
        openaiState.skipWarning = 'openai-category-compose-disabled-after-capability-check';

        if (!openaiState.hasLoggedDisablement) {
          console.log(
            'OpenAI Category Image Compose indisponivel para esta conta; seguindo com fallback local.',
          );
          openaiState.hasLoggedDisablement = true;
        }
      }
    }
  } catch (error) {
    item.status = 'failed';
    item.error = error instanceof Error ? error.message : String(error);
    item.warnings.push('compose-failed');
    console.warn(`  - ${item.slug}: falha na composicao (${item.error})`);
  }
}

function shouldDisableImageCompose(warning) {
  return (
    warning.startsWith('openai-compose-failed:401') ||
    warning.startsWith('openai-compose-failed:403')
  );
}

async function createLocalCategoryMaster(item, outputPath) {
  const palette = PALETTES[(item.categoryId - 1) % PALETTES.length];
  const layout = buildLayout(item.ingestPaths.length);
  const base = sharp({
    create: {
      width: MASTER_WIDTH,
      height: MASTER_HEIGHT,
      channels: 4,
      background: palette.base,
    },
  });

  const composites = [
    { input: Buffer.from(buildBackdropSvg(item.slug, palette)), top: 0, left: 0 },
  ];

  const slotBuffers = await Promise.all(
    item.ingestPaths.map((ingestPath, index) =>
      renderEquipmentSlot(fromProjectRelativePath(ingestPath), layout[index], palette),
    ),
  );

  for (let index = 0; index < slotBuffers.length; index += 1) {
    composites.push({
      input: slotBuffers[index],
      top: layout[index].top,
      left: layout[index].left,
    });
  }

  composites.push({
    input: Buffer.from(buildGlowSvg(item.slug, palette)),
    top: 0,
    left: 0,
    blend: 'screen',
  });

  await base.composite(composites).webp({ quality: OUTPUT_COMPRESSION }).toFile(outputPath);
}

async function pickMegaBrandingAsset(primaryEquipmentPath) {
  const luminance = await measureSubjectLuminance(primaryEquipmentPath);

  if (luminance <= 112) {
    return {
      assetPath: MEGA_LOGO_WHITE_PATH,
      variant: 'white',
      luminance,
    };
  }

  if (luminance >= 186) {
    return {
      assetPath: MEGA_LOGO_BLACK_PATH,
      variant: 'black',
      luminance,
    };
  }

  return {
    assetPath: MEGA_LOGO_COLOR_PATH,
    variant: 'color',
    luminance,
  };
}

async function measureSubjectLuminance(imagePath) {
  const trimmed = sharp(imagePath).trim({ background: CATEGORY_SOURCE_BACKGROUND, threshold: 12 });
  const stats = await trimmed.stats();
  const channels = stats.channels || [];
  if (channels.length < 3) {
    return 128;
  }

  const [red, green, blue] = channels.map((channel) => channel.mean);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

async function createSourceFallbackMaster(sourceCoverPath, outputPath) {
  if (!sourceCoverPath) {
    throw new Error('capa original da categoria nao encontrada para fallback');
  }

  const vignetteOverlay = Buffer.from(`
    <svg width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" viewBox="0 0 ${MASTER_WIDTH} ${MASTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="v" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stop-color="#ffffff08"/>
          <stop offset="100%" stop-color="#00000048"/>
        </radialGradient>
      </defs>
      <rect width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" fill="url(#v)" />
    </svg>
  `);

  await sharp(fromProjectRelativePath(sourceCoverPath))
    .resize({
      width: MASTER_WIDTH,
      height: MASTER_HEIGHT,
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .modulate({ brightness: 1.03, saturation: 1.04 })
    .sharpen()
    .composite([{ input: vignetteOverlay, top: 0, left: 0, blend: 'soft-light' }])
    .webp({ quality: OUTPUT_COMPRESSION })
    .toFile(outputPath);
}

function buildLayout(count) {
  const scaleX = (value) => Math.round((value / 1792) * MASTER_WIDTH);

  if (count <= 1) {
    return [{ left: scaleX(470), top: 145, width: scaleX(860), height: 720, angle: -2 }];
  }

  if (count === 2) {
    return [
      { left: scaleX(160), top: 170, width: scaleX(650), height: 640, angle: -7 },
      { left: scaleX(935), top: 120, width: scaleX(620), height: 690, angle: 5 },
    ];
  }

  return [
    { left: scaleX(55), top: 220, width: scaleX(520), height: 520, angle: -9 },
    { left: scaleX(585), top: 110, width: scaleX(640), height: 760, angle: -1 },
    { left: scaleX(1245), top: 200, width: scaleX(470), height: 500, angle: 8 },
  ];
}

function buildBackdropSvg(slug, palette) {
  const seed = slug.length * 17;
  const offset = 80 + (seed % 120);
  const width = MASTER_WIDTH;
  const centerX = Math.round(MASTER_WIDTH / 2);
  const circleRightX = Math.round(MASTER_WIDTH * 0.82);
  const lowerCircleX = Math.round(MASTER_WIDTH * 0.68);
  const gridStops = [0.15, 0.32, 0.49, 0.66, 0.83].map((ratio) => Math.round(width * ratio));

  return `
    <svg width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" viewBox="0 0 ${MASTER_WIDTH} ${MASTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${palette.base}" />
          <stop offset="55%" stop-color="${palette.accent}" />
          <stop offset="100%" stop-color="#09111e" />
        </linearGradient>
        <linearGradient id="band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${palette.warm}00" />
          <stop offset="50%" stop-color="${palette.warm}55" />
          <stop offset="100%" stop-color="${palette.warm}00" />
        </linearGradient>
      </defs>
      <rect width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" fill="url(#bg)" />
      <circle cx="${280 + offset}" cy="160" r="240" fill="${palette.warm}1a" />
      <circle cx="${circleRightX}" cy="220" r="280" fill="#ffffff0f" />
      <circle cx="${lowerCircleX}" cy="820" r="360" fill="${palette.warm}10" />
      <rect x="-160" y="705" width="2200" height="250" fill="#00000024" transform="rotate(-8 ${centerX} 832)" />
      <rect x="-80" y="670" width="2200" height="60" fill="url(#band)" transform="rotate(-8 ${centerX} 700)" />
      <rect x="0" y="740" width="${MASTER_WIDTH}" height="284" fill="#050c151a"/>
      <g stroke="${palette.grid}" stroke-width="1">
        <path d="M0 796 H${MASTER_WIDTH}" />
        <path d="M0 846 H${MASTER_WIDTH}" />
        <path d="M0 896 H${MASTER_WIDTH}" />
        ${gridStops.map((x) => `<path d="M${x} 0 V1024" />`).join('')}
      </g>
    </svg>
  `;
}

function buildGlowSvg(slug, palette) {
  const seed = slug.length * 23;
  const warmX = 220 + (seed % 300);

  return `
    <svg width="${MASTER_WIDTH}" height="${MASTER_HEIGHT}" viewBox="0 0 ${MASTER_WIDTH} ${MASTER_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="warm" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${palette.warm}88" />
          <stop offset="100%" stop-color="${palette.warm}00" />
        </radialGradient>
        <radialGradient id="cool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff2d" />
          <stop offset="100%" stop-color="#ffffff00" />
        </radialGradient>
      </defs>
      <circle cx="${warmX}" cy="150" r="260" fill="url(#warm)" />
      <circle cx="1390" cy="120" r="240" fill="url(#cool)" />
    </svg>
  `;
}

async function renderEquipmentSlot(sourcePath, slot, palette) {
  const trimmedBuffer = await sharp(sourcePath)
    .trim({ background: CATEGORY_SOURCE_BACKGROUND, threshold: 12 })
    .png()
    .toBuffer();

  const assetWidth = Math.round(slot.width * 0.9);
  const assetHeight = Math.round(slot.height * 0.9);
  const assetBuffer = await sharp(trimmedBuffer)
    .resize({
      width: assetWidth,
      height: assetHeight,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .modulate({ brightness: 1.02, saturation: 1.03 })
    .png()
    .toBuffer();

  const haloSvg = Buffer.from(`
    <svg width="${slot.width}" height="${slot.height}" viewBox="0 0 ${slot.width} ${slot.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow" cx="50%" cy="42%" r="52%">
          <stop offset="0%" stop-color="#ffffffde" />
          <stop offset="100%" stop-color="#ffffff00" />
        </radialGradient>
        <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#00000066" />
          <stop offset="100%" stop-color="#00000000" />
        </radialGradient>
      </defs>
      <ellipse cx="${Math.round(slot.width * 0.5)}" cy="${Math.round(slot.height * 0.88)}" rx="${Math.round(slot.width * 0.34)}" ry="${Math.round(slot.height * 0.07)}" fill="url(#shadow)" />
      <ellipse cx="${Math.round(slot.width * 0.5)}" cy="${Math.round(slot.height * 0.45)}" rx="${Math.round(slot.width * 0.42)}" ry="${Math.round(slot.height * 0.28)}" fill="url(#glow)" />
      <path d="M${Math.round(slot.width * 0.16)} ${Math.round(slot.height * 0.84)} H${Math.round(slot.width * 0.84)}" stroke="${palette.warm}55" stroke-width="6" stroke-linecap="round" />
    </svg>
  `);

  const paneBuffer = await sharp({
    create: {
      width: slot.width,
      height: slot.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: haloSvg, top: 0, left: 0, blend: 'screen' },
      {
        input: assetBuffer,
        top: Math.round((slot.height - assetHeight) / 2) - 6,
        left: Math.round((slot.width - assetWidth) / 2),
      },
    ])
    .rotate(slot.angle, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return paneBuffer;
}

function buildCategoryPrompt(item, basePrompt) {
  const supportsText = item.supportEquipmentSlugs.length
    ? item.supportEquipmentSlugs.join(', ')
    : 'nenhum equipamento de apoio necessario';
  const brandingPrompt =
    item.brandingMode === 'mega-decal'
      ? `Aplique a logo Mega Equipamentos fornecida como referencia como adesivo fisico plausivel no ${item.brandingTarget}. A logo deve parecer vinil colado na superficie do equipamento, com perspectiva, luz e desgaste natural; nunca como overlay, watermark ou grafismo solto. Escolha a variante com melhor contraste para a superficie.`
      : 'Nao introduza nenhuma marca legivel ou logotipo novo.';

  return [
    basePrompt,
    `Categoria: ${item.nome}.`,
    `Equipamento principal: ${item.primaryEquipmentSlug}.`,
    `Equipamentos de apoio: ${supportsText}.`,
    `Contexto de cena: ${item.humanSceneBrief}.`,
    `Acao humana desejada: ${item.humanActionBrief}.`,
    `EPI obrigatorio: ${item.ppeBrief}.`,
    item.allowHumanPresence
      ? 'Mostre pelo menos um operador em acao de forma natural e convincente, com contato visivel com o equipamento principal.'
      : 'Nao mostre pessoas.',
    'Priorize uma composicao crivel de uso real, com o equipamento principal em funcionamento e nao apenas exibido.',
    'Se a imagem parecer equipamento estacionado para foto ou objeto isolado em cenario vazio, ela estara errada.',
    brandingPrompt,
  ].join(' ');
}

function createLabeledImageInputs(label, imageUrl) {
  return [
    {
      type: 'input_text',
      text: label,
    },
    {
      type: 'input_image',
      image_url: imageUrl,
      detail: 'high',
    },
  ];
}

async function tryOpenAICategoryEdit(
  item,
  sourceMasterAbsolutePath,
  localMasterAbsolutePath,
  aiMasterAbsolutePath,
  openaiState,
) {
  const assetsToLoad = [
    buildDataUrlFromImage(sourceMasterAbsolutePath),
    buildDataUrlFromImage(localMasterAbsolutePath),
  ];

  if (item.sourceCoverPath) {
    assetsToLoad.push(buildDataUrlFromImage(fromProjectRelativePath(item.sourceCoverPath)));
  }

  const [sourceMasterDataUrl, localMasterDataUrl, sourceCoverDataUrl = null] =
    await Promise.all(assetsToLoad);
  const primaryReferenceImages = item.primaryIngestPath
    ? [
        {
          type: 'input_image',
          image_url: await buildDataUrlFromImage(fromProjectRelativePath(item.primaryIngestPath)),
          detail: 'high',
        },
      ]
    : [];
  const supportReferenceImages = await Promise.all(
    item.supportIngestPaths.map(async (ingestPath) => ({
      type: 'input_image',
      image_url: await buildDataUrlFromImage(fromProjectRelativePath(ingestPath)),
      detail: 'high',
    })),
  );
  const brandingReferenceImages =
    item.brandingMode === 'mega-decal' && item.brandingAssetPath
      ? [
          {
            type: 'input_image',
            image_url: await buildDataUrlFromImage(fromProjectRelativePath(item.brandingAssetPath)),
            detail: 'high',
          },
        ]
      : [];

  const attemptModels = [openaiState.imageModel, openaiState.fallbackImageModel].filter(Boolean);
  let lastErrorMessage = null;

  for (let index = 0; index < attemptModels.length; index += 1) {
    const toolModel = attemptModels[index];
    const promptVariants = [
      {
        prompt: buildCategoryPrompt(item, CATEGORY_PROMPT),
        images: [
          ...(sourceCoverDataUrl
            ? createLabeledImageInputs(
                'Referencia de ambiente e clima da categoria. Use apenas como guia de contexto humano e canteiro.',
                sourceCoverDataUrl,
              )
            : []),
          ...createLabeledImageInputs(
            'Referencia do equipamento principal. Preserve forma, cor e proporcao.',
            primaryReferenceImages[0]?.image_url,
          ).filter((entry) => !(entry.type === 'input_image' && !entry.image_url)),
          ...supportReferenceImages.flatMap((image, supportIndex) =>
            createLabeledImageInputs(
              `Referencia opcional do equipamento de apoio ${supportIndex + 1}.`,
              image.image_url,
            ),
          ),
          ...brandingReferenceImages.flatMap((image) =>
            createLabeledImageInputs(
              'Referencia da logo Mega para aplicar como adesivo fisico plausivel quando exigido.',
              image.image_url,
            ),
          ),
        ],
      },
      {
        prompt: buildCategoryPrompt(item, `${CATEGORY_PROMPT} ${CATEGORY_RETRY_PROMPT}`),
        images: [
          ...createLabeledImageInputs(
            'Referencia de capa/base da categoria. Mantenha o clima de obra, mas transforme em uso humano real.',
            sourceMasterDataUrl,
          ),
          ...createLabeledImageInputs(
            'Exemplo de composicao local; use apenas para lembrar quais equipamentos fazem parte da categoria, nunca replique esse layout.',
            localMasterDataUrl,
          ),
          ...primaryReferenceImages.flatMap((image) =>
            createLabeledImageInputs(
              'Referencia obrigatoria do equipamento principal.',
              image.image_url,
            ),
          ),
          ...supportReferenceImages.flatMap((image, supportIndex) =>
            createLabeledImageInputs(
              `Referencia opcional do equipamento de apoio ${supportIndex + 1}.`,
              image.image_url,
            ),
          ),
          ...brandingReferenceImages.flatMap((image) =>
            createLabeledImageInputs(
              'Referencia da logo Mega para adesivo fisico plausivel quando exigido.',
              image.image_url,
            ),
          ),
        ],
      },
    ];

    for (let attemptIndex = 0; attemptIndex < promptVariants.length; attemptIndex += 1) {
      const promptVariant = promptVariants[attemptIndex];

      try {
        const result = await openaiState.client.responses.create(
          {
            model: openaiState.responseModel,
            input: [
              {
                role: 'user',
                content: [
                  {
                    type: 'input_text',
                    text: promptVariant.prompt,
                  },
                  ...promptVariant.images,
                ],
              },
            ],
            tools: [
              {
                type: 'image_generation',
                action: 'edit',
                model: toolModel,
                size: MASTER_SIZE,
                quality: 'high',
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
          { timeout: 240000 },
        );

        const imageGenerationCall = result.output?.find(
          (outputItem) => outputItem.type === 'image_generation_call',
        );
        const b64Image = imageGenerationCall?.result;
        if (!b64Image) {
          return {
            accepted: false,
            warning: 'openai-category-returned-empty-image',
          };
        }

        const aiBuffer = Buffer.from(b64Image, 'base64');
        await sharp(aiBuffer).metadata();
        await sharp(aiBuffer).webp({ quality: OUTPUT_COMPRESSION }).toFile(aiMasterAbsolutePath);

        const driftScore = await computeDriftScore(sourceMasterAbsolutePath, aiMasterAbsolutePath);
        if (driftScore > DIFF_REJECT_THRESHOLD) {
          await fsPromises.rm(aiMasterAbsolutePath, { force: true });
          return {
            accepted: false,
            warning: 'openai-category-output-too-different',
            driftScore,
          };
        }

        const review = await reviewGeneratedCategoryImage(
          openaiState.client,
          openaiState.reviewModel,
          sourceMasterAbsolutePath,
          primaryReferenceImages,
          supportReferenceImages,
          brandingReferenceImages,
          aiMasterAbsolutePath,
          item,
        );

        if (!review) {
          await fsPromises.rm(aiMasterAbsolutePath, { force: true });

          if (attemptIndex < promptVariants.length - 1) {
            continue;
          }

          return {
            accepted: false,
            warning: 'openai-category-review-unavailable',
          };
        }

        if (!review.approved) {
          await fsPromises.rm(aiMasterAbsolutePath, { force: true });

          if (attemptIndex < promptVariants.length - 1) {
            continue;
          }

          return {
            accepted: false,
            warning: `openai-category-review-rejected:${(review.issueCodes || []).join('|') || 'review-failed'}:${review.issues.join(', ') || 'saida rejeitada'}`,
            driftScore,
            reviewIssueCodes: review.issueCodes || [],
            reviewIssues: review.issues,
          };
        }

        if (index > 0) {
          openaiState.imageModel = toolModel;
        }

        return {
          accepted: true,
          driftScore,
          reviewIssueCodes: review.issueCodes || [],
          reviewIssues: review.issues || [],
        };
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : String(error);

        if (index < attemptModels.length - 1 && isImageModelUnsupported(lastErrorMessage)) {
          console.log(
            `Modelo ${toolModel} indisponivel para categorias; tentando ${attemptModels[index + 1]}.`,
          );
          break;
        }

        return {
          accepted: false,
          warning: `openai-compose-failed:${lastErrorMessage}`,
        };
      }
    }
  }

  return {
    accepted: false,
    warning: `openai-compose-failed:${lastErrorMessage || 'unknown-error'}`,
  };
}

function isImageModelUnsupported(message) {
  const normalized = String(message || '').toLowerCase();
  return (
    normalized.includes('does not exist') ||
    normalized.includes('unsupported') ||
    normalized.includes('not available') ||
    normalized.includes('invalid model') ||
    normalized.includes('invalid_value')
  );
}

async function reviewGeneratedCategoryImage(
  openai,
  reviewModel,
  referencePath,
  primaryReferenceImages,
  supportReferenceImages,
  brandingReferenceImages,
  candidatePath,
  item,
) {
  try {
    const [referenceDataUrl, candidateDataUrl] = await Promise.all([
      buildDataUrlFromImage(referencePath),
      buildDataUrlFromImage(candidatePath),
    ]);
    const brandingRule =
      item.brandingMode === 'mega-decal'
        ? `Branding obrigatorio: a logo Mega deve aparecer como adesivo fisico plausivel no ${item.brandingTarget}.`
        : 'Branding obrigatorio: nenhum logotipo legivel deve aparecer.';
    const result = await openai.responses.create(
      {
        model: reviewModel,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${REVIEW_PROMPT} Categoria: ${item.nome}. Equipamento principal esperado: ${item.primaryEquipmentSlug}. Equipamentos de apoio permitidos: ${item.supportEquipmentSlugs.join(', ') || 'nenhum'}. Contexto humano esperado: ${item.humanActionBrief}. EPI esperado: ${item.ppeBrief}. ${brandingRule} Use estes codigos quando necessario: no-human-usage, static-product-scene, catalog-look, invalid-branding-application, wrong-primary-equipment, invented-equipment, text-or-watermark, missing-ppe.`,
              },
              ...createLabeledImageInputs(
                'Referencia de clima/categoria para comparar contexto visual esperado.',
                referenceDataUrl,
              ),
              ...primaryReferenceImages.flatMap((image) =>
                createLabeledImageInputs(
                  'Referencia obrigatoria do equipamento principal.',
                  image.image_url,
                ),
              ),
              ...supportReferenceImages.flatMap((image, supportIndex) =>
                createLabeledImageInputs(
                  `Referencia opcional do equipamento de apoio ${supportIndex + 1}.`,
                  image.image_url,
                ),
              ),
              ...brandingReferenceImages.flatMap((image) =>
                createLabeledImageInputs(
                  'Referencia da logo Mega para validar aplicacao fisica no equipamento quando exigido.',
                  image.image_url,
                ),
              ),
              ...createLabeledImageInputs(
                'Imagem candidata para avaliacao final. Julgue esta ultima imagem.',
                candidateDataUrl,
              ),
            ],
          },
        ],
      },
      { timeout: 120000 },
    );

    const parsed = parseReviewResponse(result.output_text || '');
    if (!parsed) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function parseReviewResponse(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  try {
    const parsed = JSON.parse(match[0]);
    const issueCodes = Array.isArray(parsed.issueCodes)
      ? parsed.issueCodes.map((issue) => String(issue)).filter(Boolean)
      : [];
    const issues = Array.isArray(parsed.issues)
      ? parsed.issues.map((issue) => String(issue)).filter(Boolean)
      : [];
    const hasHumanUsage = Boolean(parsed.hasHumanUsage);
    const hasPpe = Boolean(parsed.hasPpe);
    const looksCatalog = Boolean(parsed.looksCatalog);
    const primaryEquipmentMatches =
      parsed.primaryEquipmentMatches === undefined ? true : Boolean(parsed.primaryEquipmentMatches);
    const inventedEquipment = Boolean(parsed.inventedEquipment);
    const textOrWatermark = Boolean(parsed.textOrWatermark);
    const brandingPlausible =
      parsed.brandingPlausible === null || parsed.brandingPlausible === undefined
        ? null
        : Boolean(parsed.brandingPlausible);

    if (!hasHumanUsage && !issueCodes.includes('no-human-usage')) {
      issueCodes.push('no-human-usage');
    }

    if (!hasPpe && !issueCodes.includes('missing-ppe')) {
      issueCodes.push('missing-ppe');
    }

    if (looksCatalog && !issueCodes.includes('catalog-look')) {
      issueCodes.push('catalog-look');
    }

    if (!primaryEquipmentMatches && !issueCodes.includes('wrong-primary-equipment')) {
      issueCodes.push('wrong-primary-equipment');
    }

    if (inventedEquipment && !issueCodes.includes('invented-equipment')) {
      issueCodes.push('invented-equipment');
    }

    if (textOrWatermark && !issueCodes.includes('text-or-watermark')) {
      issueCodes.push('text-or-watermark');
    }

    if (brandingPlausible === false && !issueCodes.includes('invalid-branding-application')) {
      issueCodes.push('invalid-branding-application');
    }

    const approved =
      Boolean(parsed.approved) &&
      hasHumanUsage &&
      hasPpe &&
      !looksCatalog &&
      primaryEquipmentMatches &&
      !inventedEquipment &&
      !textOrWatermark &&
      brandingPlausible !== false;

    return {
      approved,
      hasHumanUsage,
      hasPpe,
      looksCatalog,
      brandingPlausible,
      primaryEquipmentMatches,
      inventedEquipment,
      textOrWatermark,
      issueCodes,
      issues,
    };
  } catch {
    return null;
  }
}

async function buildDataUrlFromImage(imagePath) {
  const imageBuffer = await fsPromises.readFile(imagePath);
  const metadata = await sharp(imageBuffer).metadata();
  const format = normalizeSharpFormat(metadata.format);
  const mimeType = format === 'jpeg' ? 'image/jpeg' : `image/${format}`;
  return `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
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

async function applyCategories(items, categories, categoryEnum, options) {
  console.log(
    options.dryRun ? 'Simulando aplicacao nas categorias...' : 'Aplicando capas das categorias...',
  );

  const avatarUpdates = new Map();

  for (const item of items) {
    if (item.status === 'failed' || !item.chosenMasterPath) {
      continue;
    }

    const finalDir = path.join(FINAL_PUBLIC_ROOT, item.slug);
    const sourceMasterAbsolutePath = fromProjectRelativePath(item.chosenMasterPath);
    const finalMasterAbsolutePath = path.join(finalDir, 'master.webp');
    const finalHeroAbsolutePath = path.join(finalDir, 'hero.webp');
    const finalCardAbsolutePath = path.join(finalDir, 'card.webp');

    if (!options.dryRun) {
      await ensureDir(finalDir);
      await fsPromises.copyFile(sourceMasterAbsolutePath, finalMasterAbsolutePath);
      await createDerivedImage(
        sourceMasterAbsolutePath,
        finalHeroAbsolutePath,
        HERO_WIDTH,
        HERO_HEIGHT,
      );
      await createDerivedImage(
        sourceMasterAbsolutePath,
        finalCardAbsolutePath,
        CARD_WIDTH,
        CARD_HEIGHT,
      );
    }

    avatarUpdates.set(item.categoryId, {
      avatar: item.heroPath,
      avatarHero: item.heroPath,
      avatarCard: item.cardPath,
    });
    item.status = options.dryRun ? 'ready-to-apply' : 'applied';
  }

  if (options.dryRun || avatarUpdates.size === 0) {
    return;
  }

  const updatedCategories = categories.map((categoria) => {
    const update = avatarUpdates.get(categoria.id);
    if (!update) {
      return categoria;
    }

    return {
      ...categoria,
      ...update,
    };
  });

  const sourceText = generateCategoryDataSource(updatedCategories, categoryEnum);
  await fsPromises.writeFile(CATEGORY_DATA_FILE, sourceText, 'utf8');
}

async function createDerivedImage(sourcePath, outputPath, width, height) {
  await sharp(sourcePath)
    .resize({
      width,
      height,
      fit: 'cover',
      position: sharp.strategy.attention,
    })
    .webp({ quality: OUTPUT_COMPRESSION })
    .toFile(outputPath);
}

function generateCategoryDataSource(categories, categoryEnum) {
  const lines = [
    "import { EquipamentoCategoria } from '../interfaces/equipamento-categoria';",
    "import { EquipamentosCategoriasId } from '../enums/equipamentos-categorias-id';",
    '',
    'export const equipamentosCategoriasData: EquipamentoCategoria[] = [',
  ];

  for (const categoria of categories) {
    const enumKey = categoryEnum[categoria.id];
    if (!enumKey) {
      throw new Error(`Nao foi possivel mapear o enum da categoria ${categoria.slug}.`);
    }

    lines.push('  {');
    lines.push(`    id: EquipamentosCategoriasId.${enumKey},`);
    lines.push(`    nome: ${singleQuoteLiteral(categoria.nome)},`);
    lines.push(`    name: ${singleQuoteLiteral(categoria.name)},`);
    lines.push(`    slug: ${singleQuoteLiteral(categoria.slug)},`);
    lines.push(`    icone: ${singleQuoteLiteral(categoria.icone)},`);

    if (categoria.video) {
      lines.push(`    video: ${singleQuoteLiteral(categoria.video)},`);
    }

    lines.push(`    avatar: ${singleQuoteLiteral(categoria.avatar)},`);

    if (categoria.avatarHero) {
      lines.push(`    avatarHero: ${singleQuoteLiteral(categoria.avatarHero)},`);
    }

    if (categoria.avatarCard) {
      lines.push(`    avatarCard: ${singleQuoteLiteral(categoria.avatarCard)},`);
    }

    lines.push(`    objetivo: ${singleQuoteLiteral(categoria.objetivo)},`);
    lines.push('  },');
  }

  lines.push('];', '');
  return `${lines.join('\n')}`;
}

function singleQuoteLiteral(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function buildFinalWebPath(slug, fileName) {
  return `${FINAL_WEB_ROOT}/${slug}/${fileName}`;
}

async function readLocalImageFromPath(sourcePath) {
  const relativePublicPath = sourcePath.startsWith('/') ? sourcePath.slice(1) : sourcePath;
  const absolutePath = path.join(PUBLIC_DIR, relativePublicPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`arquivo local nao encontrado: ${relativePublicPath}`);
  }

  return fsPromises.readFile(absolutePath);
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
      'user-agent': 'MegaEquipamentosCategoryPipeline/1.0',
      accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`download falhou com status ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
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
