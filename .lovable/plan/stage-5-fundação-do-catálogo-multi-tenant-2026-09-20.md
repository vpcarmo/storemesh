# Stage 5 — Fundação do catálogo multi-tenant

## Revisão arquitetural mínima

- Confirmar a arquitetura atual sem alterar o que já está adequado: `stores.id` é a identidade estável, `slug` é um identificador alternativo, e a resolução autorizada está isolada das telas.
- Registrar apenas na documentação que um domínio customizado futuro poderá resolver para `store_id` antes da autorização, sem implementar domínio, DNS ou SSL.
- Manter os repositórios recebendo o cliente autenticado por parâmetro. Isso evita acoplamento desnecessário da regra de negócio a uma única conexão e não exige abstração para infraestrutura dedicada nesta etapa.
- Não modificar `stores`, autorização ou configurações da loja salvo se a implementação revelar um bloqueio estrutural concreto.

## Banco e isolamento

- Criar `categories` com `id`, `store_id`, `name`, `slug`, `description`, `is_active`, `created_at` e `updated_at`.
- Criar `products` com `id`, `store_id`, `category_id` opcional, `name`, `slug`, `description`, `price`, `is_active`, `created_at` e `updated_at`.
- Usar unicidade composta `(store_id, slug)` nas duas tabelas, validação de slug e textos, preço `numeric` não negativo e índices necessários.
- Garantir no banco que a categoria de um produto pertence à mesma loja por chave estrangeira composta `(store_id, category_id)`.
- Aplicar timestamps automáticos com a função existente `private.set_updated_at()`.
- Conceder acesso às tabelas apenas a `authenticated` e `service_role`; nenhum acesso administrativo para `anon`.
- Ativar RLS para leitura, criação, alteração e exclusão reutilizando exclusivamente `private.has_store_access(store_id)`, preservando acesso global de `super_admin` e isolamento de `store_admin`.

## Código

- Criar tipos e normalizações simples do catálogo na camada de domínio.
- Criar um repositório de catálogo para listar e salvar categorias e produtos usando sempre `store_id` resolvido e cliente autenticado recebido.
- Criar funções de servidor autenticadas para listar, criar e editar, reutilizando `resolveAuthorizedStore`; o cliente não poderá definir identidade nem `store_id`.
- Validar entradas com Zod, incluindo slug, limites de texto, preço e categoria opcional.
- Criar uma interface administrativa mínima integrada à sessão existente para listar, criar/editar e ativar/desativar categorias e produtos, com seleção apenas das categorias carregadas da loja atual.
- Não adicionar dependências, dados de exemplo, vitrine ou funcionalidades comerciais posteriores.

## Validação

- Executar build, typecheck e lint sem corrigir os warnings Fast Refresh já conhecidos.
- Auditar schema, constraints, chave composta, gatilhos, grants e políticas RLS.
- Executar linter e verificação de segurança do backend.
- Verificar a tela pública e o console no navegador.
- Tentar o fluxo autenticado sem criar usuários ou dados fictícios; se não houver sessão/loja real disponível, registrar essa limitação separadamente.
