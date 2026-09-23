# StoreMesh

Estamos iniciando um projeto profissional de plataforma de e-commerce.

Nesta etapa, NÃO construa funcionalidades de e-commerce, páginas de produtos, carrinho, checkout, pagamentos, frete, cupons, promoções ou integrações externas.

Objetivo desta etapa: somente preparar a fundação técnica do projeto.

Requisitos:

Usar o Supabase já conectado a este projeto como backend principal. Não criar ou utilizar outro backend ou banco de dados.

Manter uma arquitetura organizada e com separação de responsabilidades entre:

apresentação/UI;

regras de negócio;

acesso a dados;

autenticação/autorização;

futuras integrações externas.

Evitar chamadas diretas e espalhadas ao Supabase dentro de componentes de UI quando uma camada de serviço apropriada puder ser utilizada.

Criar somente a estrutura mínima necessária para a aplicação iniciar de forma organizada.

Não duplicar funções, componentes ou serviços existentes. Antes de criar algo, reutilize o que já estiver disponível no projeto.

Não instalar dependências desnecessárias.

Não criar abstrações complexas sem necessidade nesta etapa.

Não alterar configurações ou arquivos sem relação direta com esta fundação.

Não criar dados fictícios ou funcionalidades simuladas.

Manter o código simples, legível e fácil de manter manualmente fora do Lovable.

Preservar qualquer configuração funcional já existente e evitar regressões.

Ao finalizar, execute os mecanismos disponíveis de validação do projeto, incluindo build, typecheck e lint quando disponíveis.

Se alguma decisão futura for necessária para implementar uma funcionalidade que ainda não foi solicitada, NÃO a implemente agora.

Ao final, apresente somente:

arquivos criados/alterados;

dependências adicionadas, se houver;

validações executadas;

eventuais problemas encontrados.

Não avance para funcionalidades futuras.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://storemesh.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/5f777388-c6f0-4a78-80a0-63baf2b04cf8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
