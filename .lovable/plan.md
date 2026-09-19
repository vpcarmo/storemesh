# Fundação técnica da plataforma

## Escopo
- Manter uma página inicial mínima, sem recursos ou dados de e-commerce.
- Organizar módulos separados para apresentação, regras de negócio, acesso a dados, autenticação/autorização e futuras integrações.
- Usar exclusivamente o backend já conectado, sem criar tabelas, dados fictícios ou fluxos de autenticação nesta etapa.
- Preservar os arquivos gerados da conexão e registrar o middleware de autenticação já fornecido.

## Implementação
- Definir tokens visuais básicos e substituir a tela de exemplo por uma tela neutra de inicialização.
- Criar apenas arquivos de entrada/documentação de responsabilidade para as camadas ainda vazias, sem abstrações prematuras.
- Criar um adaptador mínimo de sessão para centralizar o acesso de autenticação fora da interface.
- Atualizar os metadados da página inicial e remover metadados genéricos do projeto.

## Validação
- Executar build, verificação de tipos e lint.
- Corrigir apenas problemas relacionados às alterações desta etapa.
