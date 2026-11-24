# QA-PILA-001 — Edição perdida ao sair ou recarregar durante o debounce

## Reconfirmação
Em 02caa5c, salvar agenda 120 ms e só depois consulta S/USUARIO. Sair limpa ambos imediatamente. Uma edição seguida de saída no mesmo intervalo deixa a lista antiga na chave do usuário e permite ao callback gravar cesta vazia em pila.estado, sem identificador. Uma recarga antes do callback também perde a edição.
Execução isolada da função salvar real confirmou gravação em estado com cesta vazia depois de limpar usuário/estado. O agendador e o armazenamento dessa reprodução são adaptadores mínimos; isso não é evidência de navegador real. Os novos Selenium exercitam o fluxo corrigido no Chrome/Actions.

## Entrega e aceitação
- salvarAgora cancela e zera o timer e grava o estado atual na chave do usuário atual, mantendo a exclusão original do campo busca.
- Salvar normal continua usando debounce de 120 ms. Sair confirma uma gravação pendente antes de limpar sessão/estado, cancelando o callback que gravaria com outro contexto.
- pagehide confirma somente uma gravação pendente ao trocar documento, incluindo recarga normal no Chrome. Não adiciona serviço, esquema, autenticação real ou envio externo.
- Preserva itens/atributos/quantidades editadas e orçamento; visitante e conta continuam isolados por chave. Reentrada restaura os valores. Não cria pila.estado depois da saída.

## Regressão
14 cenários Selenium: 11 anteriores intactos e três novos. Visitante edita/sai e reentra com lista preservada, conta edita/sai/reautentica sem modificar lista do visitante, e recarga imediata mantém a edição. Conferem todos os atributos da cesta, itens/valores visíveis e ausência da chave anônima após o prazo do callback antigo.
Para entrar deterministicamente no intervalo de 120 ms, os testes disparam dois cliques DOM reais (editar e sair) na mesma tarefa, ou clique e location.reload. Executam handlers reais; não chamam salvar/S/USUARIO, não substituem timers/storage e não aguardam persistência entre edição e saída. Após sair aguardam 250 ms de tempo real para detectar callback indevido. A recarga aguarda documento anterior ficar obsoleto. Não mede velocidade de dois cliques físicos.
Executar cd qa && npm install && npm test (Node 22 e Chrome). Resultado final e artefato JUnit/evidências no PR da correção. Não declarar validado antes do Actions.

## Limites e continuidade
Armazem continua sem sinalizar falhas de quota/permissão; não há garantia de gravação quando storage está indisponível. pagehide depende do ciclo de vida do navegador: não garante persistência em encerramento forçado/crash, nem foi validado em dispositivos móveis/outros navegadores. Sem concorrência entre abas ou backend Java. Referência consultada: https://developer.mozilla.org/en-US/docs/Web/API/Window/pagehide_event.
Próximas entregas pequenas, após validação desta correção: reutilizar a cesta mantendo produtos/quantidades e zerando somente marcações de compra/código; tornar falha de persistência visível antes de afirmar durabilidade. Ainda não implementadas.
Dependência: branch fix/persistencia-ao-sair parte de qa/test-automation, PR #1 ainda aberto. Revisar/integrar #1 antes de retargetar a correção para main; sem duplicar suíte, merge automático ou force-push. Nenhum AGENTS.md no checkout/ancestrais consultados.
