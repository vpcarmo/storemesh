# Arquitetura da aplicação

Esta base mantém responsabilidades explícitas e evita dependências desnecessárias.

- `routes/` e `components/`: apresentação e interação com o usuário.
- `domain/`: regras de negócio puras, sem dependência de interface ou banco de dados.
- `data/`: repositórios e acesso aos dados do backend. Componentes não devem consultar o banco diretamente.
- `auth/`: sessão, autenticação e autorização. A interface consome esta camada, não o cliente gerado.
- `integrations/`: código gerado do backend e, futuramente, adaptadores de serviços externos.

Novos módulos devem ser criados somente quando uma funcionalidade real exigir. Dependências apontam da apresentação para regras e serviços; regras de negócio não dependem da apresentação nem do backend.

## Autenticação e autorização

- O único login é `/login`, com e-mail e senha. Não há cadastro público: novos usuários são convidados pelo `super_admin` em `/admin/users`.
- O convite é enviado pelo Auth Admin exclusivamente no servidor, para a URL fixa `/auth/accept-invite`; `APP_URL` deve conter a origem pública HTTPS da aplicação em produção (HTTP é aceito somente em desenvolvimento). A role e as lojas selecionadas são atribuídas depois da criação no Auth pelo RPC transacional `manage_platform_user_access`. Auth e PostgreSQL não compartilham uma transação: se a atribuição falhar, o usuário permanece sem acesso administrativo e pode ser corrigido por um `super_admin`.
- O convidado define a própria senha em `/auth/accept-invite`. A recuperação começa em `/forgot-password` e retorna a `/auth/reset-password`. O cliente oficial do Supabase processa os callbacks/PKCE e mantém a sessão; as telas apenas exigem uma sessão antes de chamar `updateUser({ password })`. Destinos de callback são fixos, sem redirects arbitrários.
- A resposta da recuperação não informa se o e-mail existe. Senhas são enviadas diretamente do browser autenticado ao Supabase Auth, não são persistidas pelo StoreMesh, e a política efetiva permanece configurada no Supabase.
- A sessão é mantida pelo cliente oficial compartilhado em `auth/session.ts`, com cookies gerenciados por `@supabase/ssr` (Secure em produção), sem persistência de sessão/tokens em `localStorage` ou `sessionStorage`; o listener global fica no root da aplicação.
- Papéis e vínculos com lojas são carregados por funções de servidor autenticadas através de `auth/` e `data/`.
- A autorização efetiva reside nas políticas RLS e nas funções de autorização do banco; verificações de interface são apenas apresentação.
- `super_admin` possui escopo global. `store_admin` sempre possui uma loja e só acessa registros autorizados para ela.
- Um usuário autenticado sem `user_roles` continua sem acesso administrativo; o login e a aceitação do convite não atribuem papéis automaticamente.
- O provisionamento de roles e lojas continua usando a infraestrutura atômica da Stage 10G.1, incluindo autorização server-side e proteção do último `super_admin`.

### Configuração operacional de Auth

No Dashboard Supabase, manter signup público e anonymous sign-ins desabilitados; habilitar confirmação de e-mail; permitir somente as URLs fixas de callback da aplicação; configurar política forte de senha, proteção de senhas vazadas quando disponível, rate limits/Attack Protection e SMTP de produção. A aplicação não altera essas configurações. MFA não faz parte desta etapa e deve ser priorizado para `super_admin` em uma futura Stage de Segurança — MFA.

## Isolamento entre lojas

- `store_id` é o limite de isolamento dos dados de cada loja. Toda tabela futura pertencente a uma loja deve referenciá-lo e aplicar políticas RLS com `private.has_store_access(store_id)`.
- A loja atual é resolvida pela camada autenticada em `auth/`, consultada por `data/` e validada novamente pelas regras puras de `domain/`.
- A identidade do usuário vem exclusivamente da sessão validada. Um identificador de usuário enviado pelo cliente nunca define o escopo.
- Um único vínculo de `store_admin` pode ser resolvido implicitamente. `super_admin` e usuários com mais de uma loja devem informar o slug desejado, sem seleção global implícita.
- `stores.id` é a identidade estável do tenant. Slug e um futuro domínio customizado são apenas formas de resolução que devem convergir para esse identificador antes da autorização.
- Os repositórios recebem o cliente de dados autenticado por parâmetro e não escolhem infraestrutura. Isso permite trocar futuramente a conexão de uma loja sem acoplar regras de domínio, sem implementar banco dedicado nesta etapa.

## Configurações da loja

- `store_settings` mantém uma única configuração principal por loja, vinculada obrigatoriamente por `store_id`.
- Dados operacionais, textos institucionais e identidade visual básica ficam nessa configuração; arquivos de logo e favicon não são armazenados nesta etapa, apenas referências HTTPS opcionais.
- Leitura e escrita passam por funções autenticadas em `auth/`, regras puras em `domain/` e um repositório em `data/`; componentes não consultam o backend diretamente.
- As políticas RLS reutilizam `private.has_store_access(store_id)`: `super_admin` mantém acesso global e `store_admin` fica limitado às lojas vinculadas.
- Uma futura interface administrativa deve consumir as mesmas funções e o mesmo repositório, sem implementar autorização paralela no cliente.

## Catálogo

- `categories` e `products` pertencem obrigatoriamente a uma loja e usam slug único apenas dentro dela.
- A relação composta entre produto, categoria e loja impede no banco que um produto use categoria de outro tenant.
- Leitura e escrita administrativas passam por funções autenticadas, domínio e repositório; as políticas RLS reutilizam `private.has_store_access(store_id)`.
- O catálogo é multi-nicho: atributos configuráveis e seus valores pertencem à loja, sem campos de produto específicos de segmento. Valores gerais podem ser associados a produtos; atributos marcados como eixo de variante compõem variantes, que permanecem opcionais.
- Variantes, imagens e todas as relações do catálogo carregam `store_id`, usam chaves compostas quando necessário para impedir referências entre tenants e reutilizam as políticas RLS existentes. Imagens guardam somente referências, sem upload nesta etapa.
- O catálogo administrativo permanece separado da vitrine. Esta base prepara módulos futuros de comércio e outros verticais sem introduzir regras de estoque, venda ou nicho.

## Storefront e tema

- A composição segue `store → store_settings → theme → layout → page → sections`; a identidade visual não possui configuração global paralela.
- `store_settings` continua sendo a fonte única para logo, favicon, cores e `design_settings`, um JSONB tipado com presets globais enumerados. O domínio converte essas configurações em tokens visuais limitados, com padrões seguros e sem aceitar CSS arbitrário; referências a mídias são resolvidas no servidor no escopo da loja.
- Header, navegação, footer e seções recebem somente dados e slots; não consultam o backend e não assumem categorias, páginas ou composição iguais entre lojas.
- Páginas são definições compostas por seções conhecidas e tipadas. A fundação reconhece Home, Catalog, Category, Product, About, Contact e páginas Static/Policy sem implementar rotas públicas ou persistência de páginas nesta etapa.
- A prévia autenticada usa as funções e os repositórios existentes para carregar configurações e catálogo reais da loja autorizada. Nenhum conteúdo comercial de demonstração é persistido.

### Administração de catálogo (Stage 8)

- A interface autenticada administra atributos, valores, produtos, imagens por URL e variantes usando exclusivamente funções de servidor que resolvem a loja com `resolveAuthorizedStore`; `store_id` nunca é aceito como escopo do cliente.
- As associações de atributos são lidas junto ao catálogo para edição. O repositório confirma que produtos, variantes e valores pertencem à loja resolvida antes de gravar, além das chaves compostas e das políticas RLS.
- A gravação de uma variante e de sua combinação é atômica por função SQL (`save_product_variant_with_attribute_values`), para que a proteção deferida contra combinações duplicadas continue válida durante edição.
