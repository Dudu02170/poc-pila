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
