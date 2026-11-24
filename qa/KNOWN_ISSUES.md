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
Reutilização da cesta entregue abaixo. Próxima pendência pequena: tornar falha de persistência visível antes de afirmar durabilidade; ainda não implementada.
Dependência: branch fix/persistencia-ao-sair parte de qa/test-automation, PR #1 ainda aberto. Revisar/integrar #1 antes de retargetar a correção para main; sem duplicar suíte, merge automático ou force-push. Nenhum AGENTS.md no checkout/ancestrais consultados.

## Ajuste das regressões após a primeira execução
A primeira execução em 55d0eaa passou 11/14 (os 11 anteriores passaram), com três falhas nos testes novos. Duas expectativas da nova automação estavam incorretas: incrementar quantidade também atualiza qtdPlena pela regra existente do catálogo; após cadastro/saída, a aba Criar conta permanece selecionada até tocar Entrar. As regressões agora esperam qtd/qtdPlena incrementadas e selecionam a aba de login como os testes anteriores. Mantêm deepEqual de todos os atributos/itens, verificação de chave e isolamento; código da aplicação não foi alterado para satisfazer esses testes. Execução inicial: https://github.com/Dudu02170/poc-pila/actions/runs/45381081137. Resultado final no PR #2.

## Reutilizar a cesta para outra compra
Entrega: botão Reutilizar esta lista na tela Pagamento, separado de Começar nova compra. Confirma antes de limpar marcações pego/faltou e código. Mantém itens e todos os demais atributos (incluindo qtd/qtdPlena/eco), ordem, perfil/pessoas/dias/restrições/extras, orçamento, filtro de marcas, ajuste e preferência de canal. Limpa corredor/painéis/buscas da compra e abre o modo casa na aba Na cesta. Não remonta a cesta nem faz ajuste automático de preços/quantidades. Executa salvarAgora antes de navegar; reaproveita a correção de QA-PILA-001.

Aceitação: cancelar não altera código, marcações, rota ou armazenamento. Confirmar mantém valores/itens editados após refresh; nova ida ao mercado começa sem itens pegos ou faltantes e sem código anterior. Pagamento sem item marcado continua sem QR; marcar um item permite gerar código pela regra local existente. Não garante unicidade do código aleatório, confirmação de pagamento, histórico ou preço de outra versão do catálogo. Conta mantém sua sessão/chave e não modifica lista do visitante. Começar nova compra preserva o fluxo original de apagar a cesta com confirmação.

Regressão: quatro novos Selenium, total 18 (14 anteriores intactos). Reutilização com perfil não padrão, restrição, quantidade editada, marca barata, pego/faltou, painéis/busca e canal totem; comparação de todos os campos/atributos esperados, nomes/preços/quantidades/total visíveis e recarga. Também cobre novo ciclo de marcação/código, cancelamento sem mudanças, ação antiga de nova compra e conta reutilizando sem itens marcados e sem alterar visitante. Usa UI, confirm e localStorage reais no Chrome/loopback, sem invocar funções internas ou simular pagamento/PDV.

Como testar: cd qa && npm install && npm test (Node 22 e Chrome). Evidência final no PR #2/Actions. Reutiliza fix/persistencia-ao-sair e depende do PR #1 de testes; não duplica mudanças. Limites de quota/permissão, ciclo de vida, concorrência entre abas e outros navegadores continuam os descritos acima. Sem backend Java, dependências novas, dados ou serviços reais.

### Preparação da UI nos testes de reutilização
A primeira execução da reutilização em 9ec8b60 passou 15/18. Três casos pararam no helper de preparação com ElementClickIntercepted: o scroll automático do WebDriver colocou o summary dos painéis sob o rodapé fixo (antes de clicar Reutilizar). A preparação agora rola os dois summary ao centro e executa o clique nativo, mantendo interceptação real, todos os estados e asserções. Não usa clique JavaScript, não oculta/remove o rodapé nem muda código da aplicação. Execução: https://github.com/Dudu02170/poc-pila/actions/runs/45399956798. Resultado final no PR #2.
