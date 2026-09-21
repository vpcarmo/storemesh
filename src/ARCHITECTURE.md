# Arquitetura da aplicação

Esta base mantém responsabilidades explícitas e evita dependências desnecessárias.

- `routes/` e `components/`: apresentação e interação com o usuário.
- `domain/`: regras de negócio puras, sem dependência de interface ou banco de dados.
- `data/`: repositórios e acesso aos dados do backend. Componentes não devem consultar o banco diretamente.
- `auth/`: sessão, autenticação e autorização. A interface consome esta camada, não o cliente gerado.
- `integrations/`: código gerado do backend e, futuramente, adaptadores de serviços externos.

Novos módulos devem ser criados somente quando uma funcionalidade real exigir. Dependências apontam da apresentação para regras e serviços; regras de negócio não dependem da apresentação nem do backend.

## Autenticação e autorização

- A autenticação usa e-mail e senha e mantém a sessão exclusivamente no cliente oficial do backend.
- Papéis e vínculos com lojas são carregados por funções de servidor autenticadas através de `auth/` e `data/`.
- A autorização efetiva reside nas políticas RLS e nas funções de autorização do banco; verificações de interface são apenas apresentação.
- `super_admin` possui escopo global. `store_admin` sempre possui uma loja e só acessa registros autorizados para ela.
- Atribuição de papéis e gestão de lojas não fazem parte da interface desta etapa e permanecem restritas a operações privilegiadas do backend.

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
- Esta fundação não inclui vitrine pública, estoque, variantes nem etapas de venda.
