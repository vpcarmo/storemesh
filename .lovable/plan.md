# Fundação multi-loja

## Escopo

Preparar a base existente para várias lojas independentes, sem criar recursos de e-commerce, dados de exemplo ou uma interface administrativa.

## Banco e isolamento

- Manter `profiles`, `stores`, `user_roles`, `app_role` e as funções de autorização existentes.
- Acrescentar em `stores` somente os campos ausentes:
  - `slug`, com validação de formato e unicidade;
  - `status`, com valores básicos controlados e padrão ativo.
- Preservar `id`, `name`, `created_at` e `updated_at` existentes.
- Manter a constraint que exige `store_id` para `store_admin` e proíbe `store_id` para `super_admin`.
- Reutilizar `private.is_super_admin()` e `private.has_store_access(store_id)`; não criar uma segunda implementação equivalente.
- Manter a política de leitura de lojas baseada em `private.has_store_access(id)`, que dá acesso global ao `super_admin` e restringe o `store_admin` às lojas vinculadas.
- Não criar políticas de escrita para usuários comuns; gestão de lojas e papéis continua reservada ao backend privilegiado.

## Resolução da loja autorizada

- Ampliar o modelo de domínio de loja com `slug` e `status`.
- Criar uma regra pura que resolva uma loja solicitada apenas entre as lojas autorizadas do contexto atual.
- Criar uma função de servidor autenticada para resolver a loja atual, usando o usuário derivado da sessão e consultas protegidas por RLS.
- Para `store_admin`, permitir somente uma loja vinculada e autorizada; para `super_admin`, exigir a identificação explícita da loja quando houver mais de uma opção, evitando seleção implícita insegura.
- Ignorar qualquer identidade de usuário enviada pelo cliente; a sessão autenticada permanece a única fonte de identidade.

## Código e documentação

- Ajustar o repositório existente para carregar `slug` e `status`.
- Manter a UI atual sem painel administrativo; alterar a apresentação somente se for necessário refletir o contexto já carregado.
- Atualizar a documentação arquitetural apenas com a regra de resolução de tenant.
- Regenerar os tipos do backend após a migração.
- Não adicionar dependências.

## Validação

- Executar build, typecheck e lint.
- Auditar schema, constraints, grants, funções e políticas RLS.
- Executar o linter e a análise de segurança do backend.
- Validar o fluxo autenticado se uma sessão puder ser obtida; caso contrário, declarar separadamente o caminho autenticado como não verificado.
- Verificar a tela pública e a ausência de erros no console.
