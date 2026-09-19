# Stage 4 — Configurações e identidade da loja

## Escopo

Criar somente a fundação persistente e a interface mínima para consultar e alterar uma configuração simples da loja autorizada, sem antecipar recursos comerciais, integrações ou administração completa.

## Banco e isolamento

- Criar `store_settings`, com uma linha por loja (`store_id` obrigatório, chave primária e referência a `stores`).
- Organizar dados operacionais em colunas tipadas para nome de exibição, descrição, contatos, endereço, horário, redes sociais e textos institucionais.
- Manter identidade visual simples na mesma configuração principal: cores, URLs de logo e favicon. Não criar armazenamento de arquivos nesta etapa.
- Usar limites de texto, validação de e-mail, URLs HTTP(S), cores hexadecimais e objetos JSON apenas para grupos flexíveis como endereço, horário e redes sociais.
- Conceder acesso somente a usuários autenticados e ao backend privilegiado; não conceder acesso anônimo.
- Ativar RLS e reutilizar exclusivamente `private.has_store_access(store_id)` nas políticas de leitura, criação, alteração e exclusão. Isso preserva acesso global do `super_admin` e restringe cada `store_admin` às lojas vinculadas.
- Não alterar `profiles`, `stores`, `user_roles`, papéis ou funções de autorização existentes.

## Código e interface mínima

- Criar tipos e validações de domínio para a configuração editável, sem `any`.
- Criar repositório dedicado para leitura e persistência via cliente autenticado do backend.
- Criar funções de servidor autenticadas que resolvem a loja pelo mecanismo existente e nunca aceitam identidade de usuário ou `store_id` arbitrário do cliente.
- Adicionar à sessão autenticada uma seção mínima para exibir e salvar o nome de exibição da loja atual; quando a loja exigir escolha explícita, a interface não fará seleção implícita.
- Atualizar a documentação arquitetural apenas com a localização, relação e isolamento das configurações.
- Regenerar os tipos do backend. Não adicionar dependências.

## Validação

- Executar build, typecheck e lint.
- Auditar tabela, constraints, grants, políticas RLS e reutilização das funções existentes.
- Executar linter e análise de segurança do backend.
- Verificar a tela pública e o console no navegador.
- Validar o fluxo autenticado se houver uma sessão e vínculo reais disponíveis; caso contrário, declarar separadamente o caminho autenticado e o isolamento entre contas como não verificados, sem criar dados fictícios.
