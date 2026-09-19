# Fundação de autenticação e autorização

## Escopo

Implementar somente autenticação por e-mail e senha, sessão, perfis, lojas e papéis `super_admin` e `store_admin`. Não criar painel administrativo nem qualquer funcionalidade comercial.

## Banco e segurança

- Criar `profiles` para os dados mínimos do usuário da aplicação.
- Criar `stores` para identificar lojas, sem dados comerciais.
- Criar `user_roles` como tabela separada de papéis e associação usuário–loja.
- Exigir `store_id` para `store_admin` e impedir dependência de loja para `super_admin`.
- Criar funções de autorização `SECURITY DEFINER` para validar papel e acesso à loja sem recursão de RLS.
- Ativar RLS e privilégios mínimos em todas as tabelas.
- Permitir ao usuário ler e atualizar o próprio perfil e consultar os próprios papéis.
- Permitir ao `store_admin` ler somente sua loja e seus próprios vínculos.
- Permitir ao `super_admin` ler a estrutura administrativa completa.
- Manter criação e alteração de lojas/papéis restritas ao backend privilegiado; não haverá interface administrativa nesta etapa.

## Código da aplicação

- Expandir a camada de autenticação existente com cadastro e login por e-mail/senha.
- Criar tipos e regras puras de autorização para os dois papéis.
- Criar uma camada de acesso a dados para carregar o perfil e os vínculos do usuário autenticado.
- Criar uma função de backend autenticada para retornar o contexto de acesso conforme RLS.
- Reutilizar o middleware de autenticação já registrado.
- Atualizar a página inicial somente com a UI mínima para cadastro, login, sessão, papéis associados e saída.
- Atualizar a documentação da arquitetura apenas com as responsabilidades adicionadas.

## Configuração e validação

- Habilitar autenticação por e-mail e senha, mantendo confirmação de e-mail e desativando usuários anônimos.
- Não adicionar dependências.
- Validar build, typecheck, lint, esquema e políticas RLS, cadastro/login/sessão quando o ambiente permitir, isolamento entre lojas e console do navegador.
- Se não houver contas com papéis ou confirmação de e-mail impedir um teste autenticado completo, registrar explicitamente o caminho não verificado sem criar dados fictícios.
