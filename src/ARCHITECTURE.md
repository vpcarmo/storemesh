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
- `auth.users` é a identidade de autenticação; `profiles` contém dados de perfil da aplicação; `user_roles` define a autorização StoreMesh. Remover um perfil ou role não remove a identidade Auth.
- O convite é enviado pelo Auth Admin exclusivamente no servidor, após autenticação e autorização `super_admin`, para a URL fixa `APP_URL + /auth/accept-invite`. `APP_URL` deve ser configurada explicitamente no servidor (origem HTTPS em produção; URL explicitamente configurada também em desenvolvimento). Não se deriva redirect de headers do navegador nem se aceita redirect do formulário. No Dashboard Supabase, a URL de aceite deve estar permitida em Authentication → URL Configuration → Redirect URLs.
- Antes do convite, o servidor verifica a lista administrativa de identidades Auth. E-mails já confirmados são recusados para gerenciamento do usuário existente; identidades não confirmadas são tratadas como convites pendentes, sem exclusão/recriação automática nem token ou e-mail próprio. A API Auth aceitar a operação não comprova que a pessoa recebeu ou abriu o e-mail; a entrega depende do template Invitation e do SMTP/Email Provider configurado em Authentication → Email.
- Depois que o Auth aceita a criação do convite, a role e as lojas são atribuídas pelo RPC transacional `manage_platform_user_access`. `super_admin` sempre recebe lista de lojas vazia; `store_admin` exige uma ou mais lojas validadas pelo servidor. Auth e PostgreSQL não compartilham uma transação: se a atribuição falhar, o usuário Auth permanece sem acesso administrativo e pode ser corrigido por um `super_admin` em `/admin/users`.
- `/admin/users` e `/admin/stores` são Platform Scope: exigem sessão e `super_admin`, mas não uma loja selecionada. As demais rotas administrativas que operam sobre dados de uma loja permanecem Store Scope e resolvem uma loja autorizada no servidor.
- O convidado define a própria senha em `/auth/accept-invite`. `@supabase/ssr` configura o cliente browser em PKCE, mas os links `inviteUserByEmail` do Auth Admin são verificados como implicit flow e retornam tokens no fragmento. O callback de convite, portanto, passa esses tokens ao `auth.setSession()` do mesmo cliente; parâmetros de callback são removidos da barra de endereço após a tentativa e não são registrados. O SDK processa normalmente os outros callbacks PKCE. `getSession()` aguarda a inicialização do Auth, e a ausência de sessão, por si só, não prova expiração; a tela só informa expiração quando recebe `error_code=otp_expired` do callback. A recuperação começa em `/forgot-password` e retorna a `/auth/reset-password`; ambas as telas exigem sessão antes de chamar `updateUser({ password })`. Destinos de callback são fixos, sem redirects arbitrários.
- A resposta da recuperação não informa se o e-mail existe. Senhas são enviadas diretamente do browser autenticado ao Supabase Auth, não são persistidas pelo StoreMesh, e a política efetiva permanece configurada no Supabase.
- A sessão é mantida pelo cliente oficial compartilhado em `auth/session.ts`, com cookies gerenciados por `@supabase/ssr` (Secure em produção), sem persistência de sessão/tokens em `localStorage` ou `sessionStorage`; o listener global fica no root da aplicação.
- Papéis e vínculos com lojas são carregados por funções de servidor autenticadas através de `auth/` e `data/`.
- A autorização efetiva reside nas políticas RLS e nas funções de autorização do banco; verificações de interface são apenas apresentação.
- `super_admin` possui escopo global. `store_admin` sempre possui uma loja e só acessa registros autorizados para ela.
- Um usuário autenticado sem `user_roles` continua sem acesso administrativo; o login e a aceitação do convite não atribuem papéis automaticamente.
- O provisionamento de roles e lojas continua usando a infraestrutura atômica da Stage 10G.1, incluindo autorização server-side e proteção do último `super_admin`.
- A exclusão administrativa remove `user_roles` e `profiles` do alvo no RPC `manage_platform_user_access`, sob o mesmo advisory lock da Stage 10G.1, e só então remove a identidade pelo Auth Admin server-side. A combinação explícita de revogação e atualização de perfil é reservada para essa exclusão; a revogação comum continua preservando o perfil. PostgreSQL e Supabase Auth não formam uma única transação: se Auth falhar, o perfil e os papéis permanecem removidos para permitir nova tentativa segura. As operações de gravação e revogação compartilham o advisory lock, mas o lock termina com a transação de revogação; um administrador concorrente ainda pode readicionar papéis antes de Auth excluir a identidade. Uma limpeza protegida pelo mesmo lock após a exclusão Auth remove atribuições eventualmente criadas nessa janela quando a operação termina com sucesso. Não há garantia de impedir temporariamente essa readição durante a janela.
- A exclusão de loja em `/admin/stores` exige confirmação do slug e autorização `super_admin` no servidor e no banco. `begin_platform_store_deletion` inativa a loja e cria uma operação persistente, vinculada à loja, ao slug original e ao iniciador. Enquanto ela existir, o trigger impede qualquer edição da loja e a policy de upload impede novas emissões de URLs assinadas. A autorização de emissão de upload e o início da exclusão compartilham um advisory lock. O Storage assina URLs pelo prazo máximo configurado no servidor Storage (em segundos); o repositório exige que `STOREMESH_STORAGE_SIGNED_UPLOAD_MAX_AGE_SECONDS` esteja configurado no servidor da aplicação com esse máximo ou valor superior e persiste esse prazo mais cinco minutos de margem. A limpeza só pode ser atestada pelo cliente `service_role` do servidor depois desse prazo. O servidor então lista e remove os objetos do prefixo UUID pelo Storage API, registra a limpeza por RPC exclusiva do `service_role` e chama a RPC autenticada que apaga os dados relacionais numa transação. Configurações, páginas, navegação, catálogo, atributos, mídia e roles com escopo da loja são removidos pelas cascatas; imagens e produtos são removidos explicitamente antes de categorias por causa das FKs `RESTRICT`. Se uma etapa falhar, a operação permanece pendente, a loja continua inativa e o Super Admin pode localizá-la e repetir a tentativa na mesma listagem. Repetir a varredura após o prazo também remove quaisquer objetos tardios antes da atestação.
- A exclusão de loja não exclui identidades `auth.users`, `profiles`, roles `super_admin`, roles de outras lojas, nem associações globais com permission profiles. O trigger de limpeza dessas associações é suspenso apenas no contexto transacional da remoção da loja. URLs externas perdem as referências StoreMesh, sem chamadas a serviços externos. Os schemas atuais não têm FK de `profiles.id` ou `user_roles.user_id` para `auth.users`, nem campos de conteúdo `created_by`, `updated_by`, `owner_id` ou `profile_id`.

### Aplicação da migration de exclusão segura

O repositório não declara um comando de aplicação de migrations em `package.json`. `drizzle.config.ts` configura Drizzle Kit, mas o journal local não registra todas as migrations SQL existentes e não há acesso, neste fluxo de trabalho, ao ledger/schema dos bancos implantados. Portanto não se pode confirmar aqui se `0017` já foi aplicada em algum ambiente; não executar `drizzle-kit migrate` usando esse histórico incompleto.

`0018_recoverable_platform_store_deletion.sql` é incremental: substitui as RPCs antigas da exclusão se presentes, remove o caminho antigo de exclusão direta e adiciona o estado persistente necessário. A entrada de journal para `0018` não reconstitui nem presume as migrations ausentes. Antes da aplicação, o responsável pelo ambiente deve confirmar o estado real do banco e o processo de release usado pelo projeto. Se o mecanismo operacional aprovado for execução SQL pelo Supabase Dashboard, aplicar somente o conteúdo exato de `0018` primeiro num banco descartável/preview, validar schema, grants e policies, e registrar a execução no controle de release do ambiente. Não aplicar `0017` outra vez se o estado do banco confirmar que já existe; caso contrário, avaliar a sequência completa com o responsável pelo banco antes de prosseguir. A aplicação em produção permanece bloqueada até confirmar esse estado e o mecanismo de release.

A expiração não é inferida do SDK JavaScript: `createSignedUploadUrl` não recebe duração. A implementação atual de Supabase Storage lê `UPLOAD_SIGNED_URL_EXPIRATION_TIME` (fallback `SIGNED_UPLOAD_URL_EXPIRATION_TIME`, padrão de código `60`) e passa o valor em segundos para a assinatura (`signUploadObjectUrl`). A configuração efetiva do projeto gerenciado não pode ser lida pelo repositório. Antes de habilitar exclusões, configurar `STOREMESH_STORAGE_SIGNED_UPLOAD_MAX_AGE_SECONDS` no servidor da aplicação para um limite igual ou superior ao valor efetivo do Storage. Sem a variável ou com valor inválido, o servidor recusa iniciar a exclusão; a migration não inventa um prazo. Referências do código do Storage: [configuração do prazo](https://github.com/supabase/storage/blob/f31599e188d7c9c854b1daa76a11b41c6d179462/src/config.ts) e [uso em segundos ao assinar](https://github.com/supabase/storage/blob/f31599e188d7c9c854b1daa76a11b41c6d179462/src/storage/object.ts).

### Configuração operacional de Auth

No ambiente que envia convites, configurar `APP_URL` para a origem real da aplicação. No Dashboard Supabase, permitir `https://dominio-real/auth/accept-invite` (substituindo pelo domínio de `APP_URL`) em Authentication → URL Configuration → Redirect URLs e verificar Authentication → Email → SMTP / Email Provider e o template Invitation. Manter signup público e anonymous sign-ins desabilitados; habilitar confirmação de e-mail; permitir somente URLs fixas de callback da aplicação; configurar política forte de senha, proteção de senhas vazadas quando disponível e rate limits/Attack Protection. A aplicação não altera essas configurações. MFA não faz parte desta etapa.

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
- `store_settings` continua sendo a fonte única para logo, favicon, cores e `design_settings`, um JSONB tipado com presets globais enumerados. O domínio converte essas configurações em tokens visuais limitados, com padrões seguros e sem aceitar CSS arbitrário; a cor de fundo das seções é opcional e não altera o fundo dos cards. Referências a mídias são resolvidas no servidor no escopo da loja.
- Header, navegação, footer e seções recebem somente dados e slots; não consultam o backend e não assumem categorias, páginas ou composição iguais entre lojas.
- Páginas são definições compostas por seções conhecidas e tipadas, persistidas pelos repositórios autenticados e renderizadas pelas rotas públicas existentes.
- Os modelos iniciais por segmento são definições declarativas sobre esses tipos de seção. A aplicação cria a página `home` somente quando a loja não possui páginas, exige permissões de Website e Configurações e preserva configurações visuais já personalizadas.
- A prévia autenticada usa as funções e os repositórios existentes para carregar configurações e catálogo reais da loja autorizada. Nenhum conteúdo comercial de demonstração é persistido.

### Administração de catálogo (Stage 8)

- A interface autenticada administra atributos, valores, produtos, imagens por URL e variantes usando exclusivamente funções de servidor que resolvem a loja com `resolveAuthorizedStore`; `store_id` nunca é aceito como escopo do cliente.
- As associações de atributos são lidas junto ao catálogo para edição. O repositório confirma que produtos, variantes e valores pertencem à loja resolvida antes de gravar, além das chaves compostas e das políticas RLS.
- A gravação de uma variante e de sua combinação é atômica por função SQL (`save_product_variant_with_attribute_values`), para que a proteção deferida contra combinações duplicadas continue válida durante edição.
