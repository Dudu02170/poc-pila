# Regressão de interface
JavaScript + Selenium; Node.js 22+ e Chrome.
```sh
cd qa
npm install
npm test
```
HEADLESS=false npm test exibe o Chrome. Servidor local e sessões limpas por cenário.
Cobertura: rotas protegidas, validação de login/cadastro, visitante, orçamento, cesta e sessão.
Os testes exercitam o HTML/JavaScript real do repositório. Nenhuma chamada de produção é necessária.
Relatório JUnit e evidências em reports/. A execução em PR usa GitHub Actions.
Limites: sem testes de e-mail, integrações externas ou múltiplos navegadores.

## Persistência durante saída e recarga
Total: 14 cenários (11 anteriores + três regressões de QA-PILA-001). Validam edição/saída/reentrada de visitante, conta sem alterar estado do visitante e recarga imediata, com preservação dos atributos e valores visíveis. Dois eventos DOM reais na mesma tarefa entram deterministicamente antes do debounce; não invocam funções internas nem substituem timers/localStorage. Após sair aguardam o prazo antigo para detectar gravação em chave anônima. Usam dados fictícios, servidor loopback e Chrome real no Actions.
Critérios, reprodução, limites e próximos passos em KNOWN_ISSUES.md. Não há backend Java, integração de autenticação/pagamento, garantia sob quota indisponível ou encerramento forçado. pagehide não é garantia em todos os navegadores; outros navegadores/dispositivos seguem pendentes. Resultado final deve ser conferido no PR/Actions.

## Reutilização da cesta
Total vigente: 18 Selenium (14 anteriores + quatro novos). Botão separado de nova compra; confirma reset de marcações/código, mantém cesta editada/perfil/orçamento/marcas/valores e volta à revisão em casa. Testes cobrem todos os campos esperados, lista/valores visíveis, refresh, nova ida ao mercado sem marcações/código, cancelamento, fluxo antigo de apagar cesta e isolamento conta/visitante. Perfil, restrição, quantidade, marca, marcações e canal são definidos por controles reais. Não chama funções internas nem substitui storage/confirm; o QR continua sendo demonstração local, sem pagamento/PDV real. Resultado final no Actions do PR #2; reprodução e limites em KNOWN_ISSUES.md.

## Falhas de gravação da lista e saída
Total vigente: 23 Selenium (18 anteriores + cinco novos). Aviso visível com retry conserva edição em memória; Sair não limpa contexto com pendência que falhou. Falha de remoção da sessão informa nova tentativa de Sair. Testa retry ainda bloqueado/recuperado/refresh, saída rápida, conta preservando visitante/cadastro e reutilização em memória seguida de gravação. Injeta erros temporários apenas em setItem/removeItem da chave alvo; storage restante e UI reais no Chrome de QA. Não mede quota/permissão reais. Asserções anteriores mantidas; critérios e limites em KNOWN_ISSUES.md. Não cobre garantia de cadastro/login, leitura corrompida, concorrência entre abas, outros navegadores ou backend Java.

## Proteção contra falha de leitura
Total vigente: 31 Selenium (23 anteriores + oito novos). JSON/formato inválido ou leitura negada bloqueia escrita do estado e oferece Tentar ler lista. Edições temporárias só são substituídas por releitura válida após confirmação. Testa bytes antigos preservados, quatro estruturas incompatíveis, cancelamento/aceite, restauração de campos/valores, erro getItem e recuperação, defaults/metadado de estado parcial válido. Corrupção fictícia no storage real; somente erro getItem da chave alvo é injetado. Não valida permissões reais, reparo/reset, concorrência ou backend. Critérios, compatibilidade e limites em KNOWN_ISSUES.md; evidência final no PR #2/Actions.
