# Stage 6 — Storefront foundation e design system

## Escopo

Criar somente a fundação visual reutilizável do storefront, consumindo `store_settings` e preservando integralmente autenticação, catálogo, RLS e persistência das etapas anteriores.

## Tema

- Criar um modelo de tema puro que converta as cores, logo e favicon já existentes em `store_settings` para tokens visuais seguros.
- Definir padrões neutros para cores ausentes, tipografia, botões, cards, espaçamento e bordas.
- Aplicar o tema por variáveis CSS limitadas e tipadas; não armazenar nem aceitar CSS arbitrário.

## Componentes e composição

- Criar componentes responsivos de header, navegação e footer orientados por dados e slots, sem categorias ou páginas fixas.
- Criar componentes reutilizáveis para Hero, Banner, Categories, ProductGrid, TextContent e CallToAction.
- Criar tipos de página e seção para Home, Catalog, Category, Product, About, Contact e Static/Policy, além de um compositor que renderize seções conhecidas.
- Manter os componentes visuais sem chamadas diretas ao backend e sem conteúdo comercial persistido ou fictício.

## Integração mínima

- Adicionar uma visualização autenticada da fundação usando a loja, configurações e catálogo reais já resolvidos pelas funções existentes; estados vazios continuarão vazios.
- A visualização reutilizará a mesma seleção de loja necessária para `super_admin`, sem alterar regras de autorização.
- Documentar o fluxo `store → store_settings → theme → layout → page → sections`.

## Validação

- Executar build, typecheck e lint, mantendo os seis warnings conhecidos.
- Verificar rotas, responsividade básica, console, ausência de dados comerciais hard-coded, ausência de configuração duplicada e ausência de regressões nas etapas 1–5.
- Não criar migração, usuário, dados fictícios, dependência, página pública, editor, carrinho ou qualquer recurso das etapas futuras.
