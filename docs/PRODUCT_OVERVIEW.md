# Product Overview

## Resumo

O DeMoviefy foi reposicionado como uma plataforma de analise de videos com IA, separando experiencia publica, uso inicial sem login e operacao autenticada administrativa.

## Camadas de acesso

### Homepage publica

- Explica o produto
- Mostra tecnologias usadas
- Apresenta diferenciadores
- Direciona para login ou modo convidado

### Modo convidado

- Permite explorar a interface sem login
- Serve como porta de entrada para a experiencia do produto
- Nao oferece governanca administrativa
- Ainda nao possui historico persistente por conta de usuario

### Area administrativa

- Protegida por autenticacao backend
- Laboratorio de testes tecnicos
- Controle de configuracoes sensiveis
- Base para governanca de modelos e limites

## Usuario x administrador

### Usuario

- Escolhe e personaliza dentro do que o sistema disponibiliza
- Pode configurar parametros de analise
- Consulta resultados, transcricoes e timestamps
- Reprocessa com novos parametros quando permitido

### Administrador

- Controla quais modelos ficam disponiveis
- Impoe limites de custo, desempenho e seguranca
- Bloqueia configuracoes invalidas
- Monitora operacao, erros e uso

## Regra de negocio central

- O usuario pode escolher modelos apenas dentre os disponiveis pelo sistema
- Parametros invalidos devem ser bloqueados automaticamente
- Configuracoes nao podem comprometer seguranca ou desempenho
- Modelos pesados podem ter restricoes de uso
- O admin governa disponibilidade, limites e acesso

## Como defender a proposta

Se houver questionamento sobre complexidade:

> A personalizacao foi pensada como diferencial do sistema, permitindo que o usuario adapte a analise conforme sua necessidade. No entanto, o administrador controla quais opcoes estao disponiveis, garantindo seguranca e estabilidade.
