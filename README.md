# MegaEquipamentos

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 20.3.8.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Consultor virtual com Netlify Function

Crie um arquivo `.env` na raiz com:

```bash
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-5-nano
OPENAI_IMAGE_MODEL=gpt-image-1
OPENAI_CATEGORY_RESPONSE_MODEL=gpt-5
OPENAI_CATEGORY_IMAGE_MODEL=gpt-image-1.5
OPENAI_CATEGORY_REVIEW_MODEL=gpt-5-nano
OPENAI_INSTITUTIONAL_RESPONSE_MODEL=gpt-5
OPENAI_INSTITUTIONAL_IMAGE_MODEL=gpt-image-1.5
OPENAI_INSTITUTIONAL_REVIEW_MODEL=gpt-5
```

Para rodar o Angular com a Netlify Function localmente, use:

```bash
npm run dev:netlify
```

O app ficará disponível em `http://localhost:8888/` e a function em
`http://localhost:8888/.netlify/functions/consultor-equipamentos`.

Se a OpenAI falhar ou a chave não estiver configurada, o chat continua funcionando com fallback
local baseado no catálogo do frontend.

## Pipeline de padronização de imagens

O projeto inclui um pipeline batch para internalizar e padronizar as imagens dos equipamentos sem
alterar os componentes Angular. Ele baixa/copias as fontes atuais, gera uma versão determinística
com `sharp`, tenta uma melhoria via OpenAI Image Edit e, quando a saída final existe, pode
reescrever automaticamente os `avatar`s do catálogo para arquivos locais.

Comandos principais:

```bash
# Simula o pipeline completo sem trocar os avatares do catálogo
npm run images:catalog -- --mode=all --dry-run

# Processa apenas imagens remotas
npm run images:catalog -- --mode=all --only-remote

# Processa apenas imagens locais
npm run images:catalog -- --mode=all --only-local

# Reprocessa apenas itens que ficaram em sharp fallback no manifesto mais recente
npm run images:catalog -- --mode=all --only-fallback

# Limita o lote para validação inicial
npm run images:catalog -- --mode=all --limit=5 --dry-run

# Processa apenas um equipamento específico por ID
npm run images:catalog -- --mode=all --equipamento-id=14 --dry-run
```

Opções disponíveis:

- `--mode=ingest|enhance|apply|all`
- `--limit=<n>`
- `--only-remote`
- `--only-local`
- `--only-fallback`
- `--equipamento-id=<id>`
- `--dry-run`

Saídas do pipeline:

- temporários e manifesto em `tmp/catalog-images`
- imagens finais em `public/imagens/equipamentos/catalogo/<categoria-slug>/<equipamento-slug>.webp`

Se `OPENAI_API_KEY` não estiver configurada ou a edição por IA falhar, o pipeline continua com o
fallback local em `sharp` e registra o motivo no manifesto.

## Pipeline de capas das categorias

O projeto também inclui um pipeline separado para criar capas editoriais das categorias a partir
dos equipamentos reais já tratados no catálogo. Ele gera uma arte-base por categoria e exporta
derivados para `hero` e `card`, com fallback local determinístico caso a IA falhe.

Comandos principais:

```bash
# Simula o pipeline completo das categorias
npm run images:categories -- --mode=all --dry-run

# Processa apenas categorias que hoje ainda usam imagem remota
npm run images:categories -- --mode=all --only-remote

# Reprocessa apenas categorias que ficaram em sharp fallback
npm run images:categories -- --mode=all --only-fallback
```

Opções disponíveis:

- `--mode=ingest|compose|apply|all`
- `--limit=<n>`
- `--only-remote`
- `--only-local`
- `--only-fallback`
- `--dry-run`

Saídas do pipeline:

- temporários e manifesto em `tmp/category-images`
- imagens finais em `public/imagens/categorias/<categoria-slug>/master.webp`
- imagem hero em `public/imagens/categorias/<categoria-slug>/hero.webp`
- imagem card em `public/imagens/categorias/<categoria-slug>/card.webp`

Ao aplicar o lote, o script reescreve `src/app/data/equipamentos-categorias-data.ts` para apontar
`avatar`, `avatarHero` e `avatarCard` para os arquivos locais gerados.

## Pipeline de imagens institucionais

O projeto agora inclui um pipeline dedicado para assets institucionais da marca. Ele preserva a
empresa, a equipe e o ambiente reais, gera uma baseline deterministica com `sharp`, tenta uma
melhoria via OpenAI e, ao aplicar, regrava os mesmos arquivos publicos usados pelo frontend.

Comandos principais:

```bash
# Simula o pipeline completo das imagens institucionais
npm run images:institutional -- --mode=all --dry-run

# Reprocessa apenas imagens que ficaram em sharp fallback
npm run images:institutional -- --mode=all --only-fallback

# Reprocessa um asset especifico
npm run images:institutional -- --mode=all --asset=fachada
```

Opcoes disponiveis:

- `--mode=ingest|enhance|apply|all`
- `--only-fallback`
- `--limit=<n>`
- `--asset=<slug>`
- `--dry-run`

Saidas do pipeline:

- temporarios e manifesto em `tmp/institutional-images`
- regravacao final dos mesmos assets publicos:
  - `public/imagens/fachada.webp`
  - `public/imagens/quem-somos-cover.jpeg`
  - `public/imagens/quem-somos.webp`

O pipeline arquiva a fonte original em `tmp/institutional-images/source-archive` para evitar perda
de qualidade em reruns. Se a OpenAI falhar ou a revisao rejeitar a imagem, o script aplica o
fallback local e registra o motivo no manifesto.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
