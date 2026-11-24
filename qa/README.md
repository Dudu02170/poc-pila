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
