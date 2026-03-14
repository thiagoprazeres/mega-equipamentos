#!/usr/bin/env node

import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

import OpenAI from 'openai';
import sharp from 'sharp';

import {
  institutionalImageConfigs,
  institutionalImageConfigBySlug,
} from './institutional-image-config.mjs';

const PROJECT_ROOT = process.cwd();
const PUBLIC_DIR = path.join(PROJECT_ROOT, 'public');
const TMP_ROOT = path.join(PROJECT_ROOT, 'tmp/institutional-images');
const SOURCE_ARCHIVE_ROOT = path.join(TMP_ROOT, 'source-archive');
const INGEST_ROOT = path.join(TMP_ROOT, 'ingest');
const ENHANCED_ROOT = path.join(TMP_ROOT, 'enhanced');
const REPORTS_ROOT = path.join(TMP_ROOT, 'reports');
const MANIFEST_FILE = path.join(REPORTS_ROOT, 'manifest.json');
const DRY_RUN_MANIFEST_FILE = path.join(REPORTS_ROOT, 'manifest.dry-run.json');

const DEFAULT_MODE = 'all';
const DEFAULT_RESPONSE_MODEL = process.env.OPENAI_INSTITUTIONAL_RESPONSE_MODEL || 'gpt-5';
const DEFAULT_IMAGE_MODEL = process.env.OPENAI_INSTITUTIONAL_IMAGE_MODEL || 'gpt-image-1.5';
const DEFAULT_IMAGE_MODEL_FALLBACK =
  process.env.OPENAI_IMAGE_MODEL ||
  (DEFAULT_IMAGE_MODEL === 'gpt-image-1.5' ? 'gpt-image-1' : DEFAULT_IMAGE_MODEL);
const DEFAULT_REVIEW_MODEL = process.env.OPENAI_INSTITUTIONAL_REVIEW_MODEL || 'gpt-5';
const DEFAULT_AI_CONCURRENCY = Math.max(
  1,
  Number.parseInt(process.env.OPENAI_INSTITUTIONAL_CONCURRENCY || '1', 10) || 1,
);
const OUTPUT_COMPRESSION = 84;
const DRIFT_REJECT_THRESHOLD = 0.46;
const INSTITUTIONAL_PROMPT = [
  'Edite esta foto institucional real da Mega Equipamentos com intervencao leve e realista.',
  'Preserve exatamente a empresa, a arquitetura, os equipamentos, a sinalizacao, as cores e a identidade visual reais.',
  'Se houver pessoas, preserve o rosto, a idade aparente, a expressao, o uniforme e a identidade da equipe sem alteracoes perceptiveis.',
  'Melhore apenas luz, contraste, limpeza visual, nitidez, enquadramento e acabamento fotografico institucional.',
  'A imagem final precisa ocupar o quadro inteiro como foto full-bleed real.',
  'Nao entregue foto menor centralizada, nao use padding, margem, canvas borrado, fundo espelhado, borda ou extensao artificial para completar o enquadramento.',
  'A imagem final deve parecer uma foto profissional da empresa real, nao uma campanha artificial ou foto de banco de imagens.',
  'Nao invente pessoas, nao troque rostos, nao mude a arquitetura, nao substitua equipamentos e nao adicione fundo novo inconsistente.',
  'Nao remova, reescreva ou invente logotipos, placas, textos, telefones ou adesivos reais da Mega.',
  'Nao transforme a foto em render 3D, ilustracao, pintura digital ou cena de publicidade exagerada.',
].join(' ');

const INSTITUTIONAL_RETRY_PROMPT = [
  'Refaca com fidelidade maior a foto original.',
  'O resultado deve parecer a mesma empresa e as mesmas pessoas, apenas melhor fotografadas.',
  'A foto precisa preencher o quadro inteiro naturalmente, sem gambiarra de fundo borrado ou foto encaixada no centro.',
  'Se a imagem parecer stock photo, campanha publicitaria artificial, pessoa diferente ou ambiente inventado, ela esta errada.',
  'Preserve todo texto e branding reais da Mega exatamente como existem na cena original.',
].join(' ');

const INSTITUTIONAL_REVIEW_PROMPT = [
  'Avalie se a imagem candidata e uma melhoria institucional leve e fiel da foto real da empresa.',
  'Aprovacao somente se a foto continuar claramente sendo da Mega Equipamentos real.',
  'Se houver pessoas e elas precisarem ser preservadas, aprove somente se continuarem reconheciveis e naturais.',
  'Rejeite se houver rosto alterado, pessoa inventada, branding mudado, texto reescrito, arquitetura diferente, equipamento trocado ou cara de stock photo.',
  'Rejeite se a imagem parecer foto menor encaixada em um fundo artificial, canvas borrado, padding lateral, moldura, borda ou qualquer preenchimento fake do quadro.',
  'Rejeite se a imagem parecer campanha publicitaria artificial, render, composicao fantasiosa ou cena incoerente com o negocio real.',
  'Responda somente com JSON no formato {"approved": boolean, "hasRequiredPerson": boolean, "identityPreserved": boolean, "brandingPreserved": boolean, "environmentPreserved": boolean, "equipmentPreserved": boolean, "looksAuthentic": boolean, "textUnchanged": boolean, "compositionFitsUse": boolean, "fullBleed": boolean, "issueCodes": string[], "issues": string[]}.',
].join(' ');

loadLocalEnvFiles();

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);

  await ensureDir(REPORTS_ROOT);

  const previousManifestIndex = loadPreviousManifestIndex();
  const selectedAssets = selectAssets(institutionalImageConfigs, options, previousManifestIndex);

  if (selectedAssets.length === 0) {
    console.log('Nenhuma imagem institucional correspondeu aos filtros informados.');
    return;
  }

  const openaiState = createOpenAIState(createOpenAIClient(options), options);
  const manifest = {
    runAt: new Date().toISOString(),
    options: {
      mode: options.mode,
      dryRun: options.dryRun,
      onlyFallback: options.onlyFallback,
      limit: options.limit,
      assets: [...options.assetSlugs],
      responseModel: options.responseModel,
      imageModel: options.imageModel,
      reviewModel: options.reviewModel,
    },
    responseModel: options.responseModel,
    imageModel: options.imageModel,
    reviewModel: options.reviewModel,
    dryRun: options.dryRun,
    items: selectedAssets.map((asset) =>
      buildManifestItem(asset, previousManifestIndex.get(asset.slug)),
    ),
    summary: {},
  };

  const shouldEnhance =
    options.mode === 'all' || options.mode === 'enhance' || options.mode === 'apply';
  const shouldApply = options.mode === 'all' || options.mode === 'apply';

  await ingestAssets(manifest.items);

  if (shouldEnhance) {
    await enhanceAssets(manifest.items, openaiState, options);
  }

  if (shouldApply) {
    await applyAssets(manifest.items, options);
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
    dryRun: false,
    onlyFallback: false,
    limit: null,
    assetSlugs: new Set(),
    responseModel: DEFAULT_RESPONSE_MODEL,
    imageModel: DEFAULT_IMAGE_MODEL,
    reviewModel: DEFAULT_REVIEW_MODEL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--dry-run') {
      options.dryRun = true;
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

    if (arg.startsWith('--asset=')) {
      addAssetSlugs(arg.split('=')[1], options.assetSlugs);
      continue;
    }

    if (arg === '--asset') {
      addAssetSlugs(argv[index + 1], options.assetSlugs);
      index += 1;
    }
  }

  return options;
}

function addAssetSlugs(value, assetSlugs) {
  for (const slug of String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)) {
    assetSlugs.add(slug);
  }
}

function validateOptions(options) {
  const validModes = new Set(['all', 'ingest', 'enhance', 'apply']);
  if (!validModes.has(options.mode)) {
    throw new Error(`Modo invalido: ${options.mode}. Use all, ingest, enhance ou apply.`);
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('O valor de --limit precisa ser um inteiro maior que zero.');
  }

  for (const slug of options.assetSlugs) {
    if (!institutionalImageConfigBySlug.has(slug)) {
      throw new Error(`Asset institucional invalido: ${slug}.`);
    }
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
    skipWarning: client ? null : 'openai-institutional-edit-skipped',
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
    return new Map(items.map((item) => [item.slug, item]));
  } catch {
    return new Map();
  }
}

function selectAssets(assets, options, previousManifestIndex = new Map()) {
  let filtered = assets.filter((asset) => {
    const previousManifestItem = previousManifestIndex.get(asset.slug);
    const artifactState = inspectAssetArtifacts(asset);

    if (options.assetSlugs.size > 0 && !options.assetSlugs.has(asset.slug)) {
      return false;
    }

    if (options.onlyFallback) {
      const pendingFallbackRetry =
        previousManifestItem?.strategy === 'sharp-fallback' ||
        (artifactState.normalizedExists && !artifactState.aiExists);
      const pendingAiApply =
        artifactState.aiExists && (!artifactState.finalExists || !artifactState.finalMatchesAi);
      return pendingFallbackRetry || pendingAiApply;
    }

    return true;
  });

  if (options.limit !== null) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

function buildManifestItem(asset, previousManifestItem) {
  const artifactState = inspectAssetArtifacts(asset);

  return {
    slug: asset.slug,
    nome: asset.nome,
    sourcePath: asset.sourcePath,
    finalPath: asset.finalPath,
    archivedSourcePath: artifactState.archivedExists ? artifactState.archivedSourcePath : null,
    ingestPath: null,
    normalizedPath: artifactState.normalizedExists ? artifactState.normalizedPath : null,
    aiPath: artifactState.aiExists ? artifactState.aiPath : null,
    chosenPath: null,
    strategy: 'unchanged',
    status: 'pending',
    warnings: previousManifestItem?.warnings?.includes('reused-source-archive')
      ? ['reused-source-archive']
      : [],
    driftScore: null,
    reviewIssueCodes: [],
    reviewIssues: [],
    error: null,
  };
}

function inspectAssetArtifacts(asset) {
  const archivedSourceAbsolutePath = path.join(
    SOURCE_ARCHIVE_ROOT,
    `${asset.slug}${normalizeFileExtension(path.extname(asset.sourcePath), asset.finalFormat)}`,
  );
  const ingestAbsolutePath = path.join(INGEST_ROOT, `${asset.slug}.png`);
  const normalizedAbsolutePath = path.join(ENHANCED_ROOT, `${asset.slug}.normalized.webp`);
  const aiAbsolutePath = path.join(ENHANCED_ROOT, `${asset.slug}.ai.webp`);
  const finalAbsolutePath = resolvePublicAbsolutePath(asset.finalPath);

  const archivedExists = fs.existsSync(archivedSourceAbsolutePath);
  const ingestExists = fs.existsSync(ingestAbsolutePath);
  const normalizedExists = fs.existsSync(normalizedAbsolutePath);
  const aiExists = fs.existsSync(aiAbsolutePath);
  const finalExists = fs.existsSync(finalAbsolutePath);

  return {
    archivedExists,
    ingestExists,
    normalizedExists,
    aiExists,
    finalExists,
    archivedSourcePath: toProjectRelativePath(archivedSourceAbsolutePath),
    ingestPath: toProjectRelativePath(ingestAbsolutePath),
    normalizedPath: toProjectRelativePath(normalizedAbsolutePath),
    aiPath: toProjectRelativePath(aiAbsolutePath),
    finalPath: toProjectRelativePath(finalAbsolutePath),
    finalMatchesAi: aiExists && finalExists ? filesMatch(finalAbsolutePath, aiAbsolutePath) : false,
  };
}

function normalizeFileExtension(extension, fallbackFormat) {
  const normalized = String(extension || '').toLowerCase();
  if (
    normalized === '.jpg' ||
    normalized === '.jpeg' ||
    normalized === '.webp' ||
    normalized === '.png'
  ) {
    return normalized === '.jpg' ? '.jpeg' : normalized;
  }

  if (fallbackFormat === 'jpeg') {
    return '.jpeg';
  }

  return `.${fallbackFormat || 'webp'}`;
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

async function ingestAssets(items) {
  console.log(`Iniciando ingestao de ${items.length} imagem(ns)...`);

  for (const item of items) {
    try {
      const asset = institutionalImageConfigBySlug.get(item.slug);
      const prepared = await prepareInstitutionalSource(asset, item);
      item.archivedSourcePath = prepared.archivedSourcePath;
      item.ingestPath = prepared.ingestPath;
      item.status = 'ingested';
    } catch (error) {
      item.status = 'failed';
      item.error = error instanceof Error ? error.message : String(error);
      item.warnings.push('source-ingest-failed');
      console.warn(`  - ${item.slug}: falha na ingestao (${item.error})`);
    }
  }
}

async function prepareInstitutionalSource(asset, item) {
  const sourceAbsolutePath = resolvePublicAbsolutePath(asset.sourcePath);
  const archiveAbsolutePath = path.join(
    SOURCE_ARCHIVE_ROOT,
    `${asset.slug}${normalizeFileExtension(path.extname(asset.sourcePath), asset.finalFormat)}`,
  );
  const ingestAbsolutePath = path.join(INGEST_ROOT, `${asset.slug}.png`);

  await ensureDir(path.dirname(archiveAbsolutePath));
  await ensureDir(path.dirname(ingestAbsolutePath));

  if (!fs.existsSync(archiveAbsolutePath)) {
    await fsPromises.copyFile(sourceAbsolutePath, archiveAbsolutePath);
  } else {
    item.warnings.push('reused-source-archive');
  }

  const rotated = sharp(await fsPromises.readFile(archiveAbsolutePath)).rotate();
  await rotated.png().toFile(ingestAbsolutePath);

  return {
    archivedSourcePath: toProjectRelativePath(archiveAbsolutePath),
    ingestPath: toProjectRelativePath(ingestAbsolutePath),
  };
}

async function enhanceAssets(items, openaiState, options) {
  console.log('Melhorando imagens institucionais...');

  const eligibleItems = items.filter((item) => item.status !== 'failed' && item.ingestPath);
  let cursor = 0;
  const workerCount = Math.min(DEFAULT_AI_CONCURRENCY, eligibleItems.length || 1);

  const worker = async () => {
    while (cursor < eligibleItems.length) {
      const item = eligibleItems[cursor];
      cursor += 1;
      await enhanceSingleAsset(item, openaiState, options);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}

async function enhanceSingleAsset(item, openaiState, options) {
  if (item.status === 'failed' || !item.ingestPath) {
    return;
  }

  console.log(`  - ${item.slug}: iniciando melhoria...`);

  try {
    const asset = institutionalImageConfigBySlug.get(item.slug);
    const ingestAbsolutePath = fromProjectRelativePath(item.ingestPath);
    const normalizedAbsolutePath = path.join(ENHANCED_ROOT, `${item.slug}.normalized.webp`);

    await ensureDir(path.dirname(normalizedAbsolutePath));
    await createDeterministicInstitutionalImage(asset, ingestAbsolutePath, normalizedAbsolutePath);

    item.normalizedPath = toProjectRelativePath(normalizedAbsolutePath);
    item.chosenPath = item.normalizedPath;
    item.strategy = 'sharp-fallback';
    item.status = 'enhanced';

    if (!openaiState.client || !openaiState.enabled) {
      item.warnings.push(openaiState.skipWarning || 'openai-institutional-edit-skipped');
      console.log(`  - ${item.slug}: seguindo com fallback local.`);
      return;
    }

    const aiAbsolutePath = path.join(ENHANCED_ROOT, `${item.slug}.ai.webp`);
    const aiResult = await tryOpenAIInstitutionalEdit(
      asset,
      ingestAbsolutePath,
      normalizedAbsolutePath,
      aiAbsolutePath,
      openaiState,
      options,
    );

    if (aiResult.accepted) {
      item.aiPath = toProjectRelativePath(aiAbsolutePath);
      item.chosenPath = item.aiPath;
      item.strategy = 'ai';
      item.driftScore = aiResult.driftScore;
      item.reviewIssueCodes = aiResult.reviewIssueCodes || [];
      item.reviewIssues = aiResult.reviewIssues || [];
      console.log(`  - ${item.slug}: imagem IA aprovada.`);
    } else if (aiResult.warning) {
      item.warnings.push(aiResult.warning);
      item.driftScore = aiResult.driftScore;
      item.reviewIssueCodes = aiResult.reviewIssueCodes || [];
      item.reviewIssues = aiResult.reviewIssues || [];
      console.log(`  - ${item.slug}: fallback local (${aiResult.warning}).`);

      if (shouldDisableImageEdit(aiResult.warning)) {
        openaiState.enabled = false;
        openaiState.skipWarning = 'openai-institutional-edit-disabled-after-capability-check';

        if (!openaiState.hasLoggedDisablement) {
          console.log(
            'OpenAI Institutional Image Edit indisponivel para esta conta; seguindo com fallback local.',
          );
          openaiState.hasLoggedDisablement = true;
        }
      }
    }
  } catch (error) {
    item.status = 'failed';
    item.error = error instanceof Error ? error.message : String(error);
    item.warnings.push('enhancement-failed');
    console.warn(`  - ${item.slug}: falha ao melhorar (${item.error})`);
  }
}

function shouldDisableImageEdit(warning) {
  return (
    warning.startsWith('openai-institutional-edit-failed:401') ||
    warning.startsWith('openai-institutional-edit-failed:403')
  );
}

async function createDeterministicInstitutionalImage(asset, sourcePath, outputPath) {
  await renderInstitutionalFrame(asset, sourcePath, outputPath, 'webp', OUTPUT_COMPRESSION);
}

async function renderInstitutionalFrame(
  asset,
  sourcePath,
  outputPath,
  outputFormat,
  outputQuality,
) {
  const { targetWidth, targetHeight, deterministicStrategy } = asset;

  await sharp(sourcePath)
    .rotate()
    .resize({
      width: targetWidth,
      height: targetHeight,
      fit: 'cover',
      position: deterministicStrategy.position || 'attention',
    })
    .normalize()
    .modulate({
      brightness: deterministicStrategy.brightness || 1.02,
      saturation: deterministicStrategy.saturation || 1.02,
    })
    .sharpen()
    [outputFormat](buildOutputOptions(outputFormat, outputQuality))
    .toFile(outputPath);
}

function buildOutputOptions(outputFormat, outputQuality) {
  if (outputFormat === 'jpeg') {
    return { quality: outputQuality, mozjpeg: true };
  }

  return { quality: outputQuality };
}

function buildInstitutionalPrompt(asset, basePrompt) {
  const peopleRule = asset.requireVisiblePerson
    ? 'A pessoa real da foto precisa continuar presente, reconhecivel e natural.'
    : 'Nao adicione pessoas novas nem simule equipe se a cena original nao tiver pessoas.';
  const identityRule = asset.preserveIdentity
    ? 'Nao altere rosto, expressao, idade aparente, corpo ou identidade da equipe.'
    : 'Nao descaracterize a empresa ou o local real.';

  return [
    basePrompt,
    `Asset: ${asset.nome}.`,
    `Contexto de uso: ${asset.reviewContext}.`,
    asset.promptDetails,
    peopleRule,
    identityRule,
    asset.preserveBranding
      ? 'Preserve logotipos, placas, adesivos e textos reais da Mega exatamente como aparecem.'
      : 'Nao invente branding novo.',
    asset.preserveEnvironment
      ? 'Preserve o ambiente real, a arquitetura e a organizacao do local.'
      : 'Nao invente novo ambiente.',
    asset.preserveEquipment
      ? 'Preserve exatamente os equipamentos e objetos de trabalho reais da foto.'
      : 'Nao invente objetos novos desnecessarios.',
    asset.allowAddedPeople
      ? 'Pessoas adicionais so sao permitidas se nao descaracterizarem a equipe real.'
      : 'Nao adicione pessoas extras.',
    'A composicao precisa ser full-bleed real e preencher o quadro inteiro naturalmente.',
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

async function tryOpenAIInstitutionalEdit(
  asset,
  sourceAbsolutePath,
  normalizedAbsolutePath,
  aiAbsolutePath,
  openaiState,
  options,
) {
  const [sourceDataUrl, normalizedDataUrl] = await Promise.all([
    buildDataUrlFromImage(sourceAbsolutePath),
    buildDataUrlFromImage(normalizedAbsolutePath),
  ]);
  const attemptModels = [openaiState.imageModel, openaiState.fallbackImageModel]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index);
  let lastErrorMessage = null;

  for (let modelIndex = 0; modelIndex < attemptModels.length; modelIndex += 1) {
    const toolModel = attemptModels[modelIndex];
    const promptVariants = [
      {
        prompt: buildInstitutionalPrompt(asset, INSTITUTIONAL_PROMPT),
        images: [
          ...createLabeledImageInputs(
            'Foto institucional original da Mega a preservar com fidelidade.',
            sourceDataUrl,
          ),
        ],
      },
      {
        prompt: buildInstitutionalPrompt(
          asset,
          `${INSTITUTIONAL_PROMPT} ${INSTITUTIONAL_RETRY_PROMPT}`,
        ),
        images: [
          ...createLabeledImageInputs(
            'Foto institucional original da Mega a preservar com fidelidade.',
            sourceDataUrl,
          ),
          ...createLabeledImageInputs(
            'Baseline local de enquadramento e acabamento; use so como referencia de composicao.',
            normalizedDataUrl,
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
                size: asset.aiSize || `${asset.targetWidth}x${asset.targetHeight}`,
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
            warning: 'openai-institutional-returned-empty-image',
          };
        }

        const aiBuffer = Buffer.from(b64Image, 'base64');
        await sharp(aiBuffer).metadata();
        await sharp(aiBuffer).webp({ quality: OUTPUT_COMPRESSION }).toFile(aiAbsolutePath);

        const driftScore = await computeDriftScore(normalizedAbsolutePath, aiAbsolutePath);
        if (driftScore > DRIFT_REJECT_THRESHOLD) {
          await fsPromises.rm(aiAbsolutePath, { force: true });

          if (attemptIndex < promptVariants.length - 1) {
            continue;
          }

          return {
            accepted: false,
            warning: 'openai-institutional-output-too-different',
            driftScore,
          };
        }

        const review = await reviewGeneratedInstitutionalImage(
          openaiState.client,
          openaiState.reviewModel,
          asset,
          sourceAbsolutePath,
          normalizedAbsolutePath,
          aiAbsolutePath,
        );

        if (!review) {
          await fsPromises.rm(aiAbsolutePath, { force: true });

          if (attemptIndex < promptVariants.length - 1) {
            continue;
          }

          return {
            accepted: false,
            warning: 'openai-institutional-review-unavailable',
          };
        }

        if (!review.approved) {
          await fsPromises.rm(aiAbsolutePath, { force: true });

          if (attemptIndex < promptVariants.length - 1) {
            continue;
          }

          return {
            accepted: false,
            warning: `openai-institutional-review-rejected:${(review.issueCodes || []).join('|') || 'review-failed'}:${review.issues.join(', ') || 'saida rejeitada'}`,
            driftScore,
            reviewIssueCodes: review.issueCodes || [],
            reviewIssues: review.issues || [],
          };
        }

        if (modelIndex > 0) {
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

        if (modelIndex < attemptModels.length - 1 && isImageModelUnsupported(lastErrorMessage)) {
          console.log(
            `Modelo ${toolModel} indisponivel para institucional; tentando ${attemptModels[modelIndex + 1]}.`,
          );
          break;
        }

        return {
          accepted: false,
          warning: `openai-institutional-edit-failed:${lastErrorMessage}`,
        };
      }
    }
  }

  return {
    accepted: false,
    warning: `openai-institutional-edit-failed:${lastErrorMessage || 'unknown-error'}`,
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

async function reviewGeneratedInstitutionalImage(
  openai,
  reviewModel,
  asset,
  sourceAbsolutePath,
  normalizedAbsolutePath,
  candidatePath,
) {
  try {
    const [sourceDataUrl, normalizedDataUrl, candidateDataUrl] = await Promise.all([
      buildDataUrlFromImage(sourceAbsolutePath),
      buildDataUrlFromImage(normalizedAbsolutePath),
      buildDataUrlFromImage(candidatePath),
    ]);

    const peopleRule = asset.requireVisiblePerson
      ? 'A pessoa real da foto precisa continuar visivel e reconhecivel.'
      : 'Nao deve haver pessoas novas adicionadas.';
    const result = await openai.responses.create(
      {
        model: reviewModel,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: `${INSTITUTIONAL_REVIEW_PROMPT} Asset: ${asset.nome}. Contexto: ${asset.reviewContext}. ${asset.promptDetails} ${peopleRule} Use estes codigos quando necessario: missing-person, identity-changed, branding-changed, environment-changed, equipment-changed, stock-photo-look, invented-text, composition-mismatch, embedded-photo-look.`,
              },
              ...createLabeledImageInputs(
                'Foto institucional original a preservar.',
                sourceDataUrl,
              ),
              ...createLabeledImageInputs(
                'Baseline local de enquadramento e limpeza.',
                normalizedDataUrl,
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

    return parseReviewResponse(result.output_text || '', asset);
  } catch {
    return null;
  }
}

function parseReviewResponse(text, asset) {
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

    const hasRequiredPerson =
      parsed.hasRequiredPerson === undefined ? true : Boolean(parsed.hasRequiredPerson);
    const identityPreserved =
      parsed.identityPreserved === undefined ? true : Boolean(parsed.identityPreserved);
    const brandingPreserved =
      parsed.brandingPreserved === undefined ? true : Boolean(parsed.brandingPreserved);
    const environmentPreserved =
      parsed.environmentPreserved === undefined ? true : Boolean(parsed.environmentPreserved);
    const equipmentPreserved =
      parsed.equipmentPreserved === undefined ? true : Boolean(parsed.equipmentPreserved);
    const looksAuthentic =
      parsed.looksAuthentic === undefined ? true : Boolean(parsed.looksAuthentic);
    const textUnchanged = parsed.textUnchanged === undefined ? true : Boolean(parsed.textUnchanged);
    const compositionFitsUse =
      parsed.compositionFitsUse === undefined ? true : Boolean(parsed.compositionFitsUse);
    const fullBleed = parsed.fullBleed === undefined ? true : Boolean(parsed.fullBleed);

    if (
      asset.requireVisiblePerson &&
      !hasRequiredPerson &&
      !issueCodes.includes('missing-person')
    ) {
      issueCodes.push('missing-person');
    }

    if (asset.preserveIdentity && !identityPreserved && !issueCodes.includes('identity-changed')) {
      issueCodes.push('identity-changed');
    }

    if (asset.preserveBranding && !brandingPreserved && !issueCodes.includes('branding-changed')) {
      issueCodes.push('branding-changed');
    }

    if (
      asset.preserveEnvironment &&
      !environmentPreserved &&
      !issueCodes.includes('environment-changed')
    ) {
      issueCodes.push('environment-changed');
    }

    if (
      asset.preserveEquipment &&
      !equipmentPreserved &&
      !issueCodes.includes('equipment-changed')
    ) {
      issueCodes.push('equipment-changed');
    }

    if (!looksAuthentic && !issueCodes.includes('stock-photo-look')) {
      issueCodes.push('stock-photo-look');
    }

    if (!textUnchanged && !issueCodes.includes('invented-text')) {
      issueCodes.push('invented-text');
    }

    if (!compositionFitsUse && !issueCodes.includes('composition-mismatch')) {
      issueCodes.push('composition-mismatch');
    }

    if (!fullBleed && !issueCodes.includes('embedded-photo-look')) {
      issueCodes.push('embedded-photo-look');
    }

    const approved =
      Boolean(parsed.approved) &&
      (!asset.requireVisiblePerson || hasRequiredPerson) &&
      (!asset.preserveIdentity || identityPreserved) &&
      (!asset.preserveBranding || brandingPreserved) &&
      (!asset.preserveEnvironment || environmentPreserved) &&
      (!asset.preserveEquipment || equipmentPreserved) &&
      looksAuthentic &&
      textUnchanged &&
      compositionFitsUse &&
      fullBleed;

    return {
      approved,
      issueCodes,
      issues,
    };
  } catch {
    return null;
  }
}

async function applyAssets(items, options) {
  console.log(
    options.dryRun
      ? 'Simulando aplicacao das imagens institucionais...'
      : 'Aplicando imagens institucionais...',
  );

  for (const item of items) {
    if (item.status === 'failed' || !item.chosenPath) {
      continue;
    }

    const asset = institutionalImageConfigBySlug.get(item.slug);
    const sourceAbsolutePath = fromProjectRelativePath(item.chosenPath);
    const finalAbsolutePath = resolvePublicAbsolutePath(asset.finalPath);

    if (!options.dryRun) {
      await ensureDir(path.dirname(finalAbsolutePath));
      await writeFinalInstitutionalImage(asset, sourceAbsolutePath, finalAbsolutePath);
    }

    item.status = options.dryRun ? 'ready-to-apply' : 'applied';
  }
}

async function writeFinalInstitutionalImage(asset, sourceAbsolutePath, finalAbsolutePath) {
  const metadata = await sharp(sourceAbsolutePath).metadata();
  const outputWidth = metadata.width || 0;
  const outputHeight = metadata.height || 0;
  const outputOptions = buildOutputOptions(asset.finalFormat, asset.finalQuality || 86);

  if (outputWidth === asset.targetWidth && outputHeight === asset.targetHeight) {
    const pipeline = sharp(sourceAbsolutePath).rotate();

    if (asset.finalFormat === 'jpeg') {
      await pipeline
        .flatten({ background: '#ffffff' })
        .jpeg(outputOptions)
        .toFile(finalAbsolutePath);
      return;
    }

    await pipeline.webp(outputOptions).toFile(finalAbsolutePath);
    return;
  }

  await renderInstitutionalFrame(
    asset,
    sourceAbsolutePath,
    finalAbsolutePath,
    asset.finalFormat,
    asset.finalQuality || 86,
  );
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

function summarizeManifest(items, options) {
  const summary = {
    selected: items.length,
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

function getManifestOutputPath(options) {
  return options.dryRun ? DRY_RUN_MANIFEST_FILE : MANIFEST_FILE;
}

function resolvePublicAbsolutePath(publicPath) {
  return path.join(PUBLIC_DIR, publicPath.startsWith('/') ? publicPath.slice(1) : publicPath);
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
