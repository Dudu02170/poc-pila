# Pila · Cada pila no lugar certo

Protótipo de app de compras de supermercado criado em equipe para o **AppJam da Expoagas 2026** (43ª Convenção Gaúcha de Supermercados, Porto Alegre).

**[Ver o protótipo funcionando →](https://dudu02170.github.io/poc-pila)**

## O problema

Fazer mercado com orçamento apertado é difícil: a pessoa monta a lista sem saber quanto vai gastar, se perde nos corredores e só descobre o total no caixa.

## A solução

O Pila divide a compra em dois momentos, e a tela muda conforme o momento:

1. **Em casa:** a pessoa diz quanto quer gastar e o Pila monta a cesta inteira dentro do orçamento, levando em conta o tamanho da família, por quanto tempo a compra precisa durar e restrições alimentares (sem lactose, sem glúten, sem carne, menos açúcar). Dá para escolher a linha de marcas (mais baratas, mais vendidas ou premium) e ver receitas com o que já está na cesta.
2. **No mercado:** a lista aparece na ordem dos corredores, com botões grandes para marcar com o polegar sem parar de andar. O total e o quanto ainda sobra do orçamento ficam sempre visíveis.
3. **No caixa:** um QR code fecha a compra sem passar item por item.

## Destaques técnicos

- **Arquivo único** (`index.html`) com HTML, CSS e JavaScript puro, sem frameworks e sem build.
- **Funciona offline e sem servidor:** conta, lista e orçamento ficam no `localStorage` do aparelho, e o QR code é gerado no próprio navegador.
- **Pensado para uso real:** o QR carregaria só o número do pedido. O caixa consultaria o servidor da loja para pegar a lista e o valor, então ninguém conseguiria forjar um QR mais barato.
- **Mobile first**, com alvos de toque grandes no modo mercado.

> Catálogo, preços e layout da loja são fictícios.

Alterações da lista são salvas localmente com debounce. Ao sair da conta ou trocar o documento por uma navegação/recarga normal, uma gravação pendente é feita antes de limpar o contexto. Isso preserva edições rápidas na chave do usuário atual. Se a gravação da lista falhar, um aviso informa que as alterações estão só na memória desta aba e oferece **Tentar salvar lista**. Mantenha a aba aberta: sair fica bloqueado enquanto houver uma alteração não gravada; após recuperar o armazenamento, tente salvar e depois sair. Falha ao remover a sessão também mantém o usuário na tela e pede nova tentativa de Sair. Não é garantia contra crash ou encerramento forçado; autenticação e pagamento continuam sendo demonstrações locais. Regressão e limites em `qa/KNOWN_ISSUES.md`.

Se a lista salva não puder ser lida ou tiver formato incompatível, a aplicação mantém os dados antigos e bloqueia sua sobrescrita. Você pode explorar uma lista temporária nesta aba; **Tentar ler lista** permite recuperar os dados quando o acesso/conteúdo for corrigido. Se houver alterações temporárias, a releitura pede confirmação antes de substituí-las. **Baixar cópia local** solicita o conteúdo textual atual da lista em um arquivo UTF-8, inclusive quando inválido. Confira o arquivo antes de usar **Usar lista temporária**: essa ação exige confirmação para descartar o conteúdo inválido e gravar os campos/itens atuais desta aba. A substituição é recusada se os dados já tiverem mudado ou se a leitura estiver inacessível. Não há reparo ou importação automática.

Antes de gravar uma lista do usuário, o Pila confere se o conteúdo salvo ainda é aquele lido por esta aba. Se outra aba já o alterou, mantém as edições locais em memória e oferece **Recarregar lista salva**, com confirmação antes de substituí-las. Antes de recarregar, **Baixar lista desta aba** permite guardar os campos e itens temporários em `pila-lista-desta-aba.json`. A mesma ação aparece quando uma edição não pode ser gravada ou a lista salva não pode ser lida. Ela copia somente a lista em memória, sem consultar/substituir o armazenamento nem incluir cadastro/sessão. Confira o arquivo: o download é apenas solicitado, não há importação automática e a cópia não libera a saída com pendências. Depois de conferir a lista atual, reaplique a edição desejada. A conferência é sequencial: ainda não garante exclusão mútua entre escritas simultâneas de abas diferentes.

## Guardar e restaurar uma lista
Na etapa **Orçamento**, abra **Guardar ou restaurar uma lista**. **Baixar lista atual** solicita uma cópia JSON dos campos e itens atuais desta aba, mesmo sem falha de salvamento. Não grava nem consulta o armazenamento e não altera uma prévia de restauração já selecionada. A cópia usa `pila-lista-desta-aba.json`, sem incluir cadastro/sessão da aplicação; confira o arquivo antes de substituir sua lista. Uma lista vazia também pode ser copiada. Download solicitado não garante conclusão e não limpa pendências de salvamento.

Para restaurar como nova compra, escolha um JSON de lista do Pila com até 1 MiB. Confira produtos, quantidades, pessoas, dias e orçamento na prévia; selecionar o arquivo não substitui a lista. **Restaurar esta cópia** pede confirmação para substituir a lista e as edições atuais. Guarde seu trabalho antes de continuar; **Cancelar seleção** limpa apenas a prévia.

A restauração mantém produtos/quantidades/atributos, perfil, orçamento, marcas, canal e metadados da lista. Inicia uma nova compra: limpa marcações de pego/não encontrado, código, ajuste e navegação anteriores. Usa o catálogo fictício atual; não restaura preços históricos, contas ou pagamentos. Arquivo inválido/incompatível ou acima do limite é recusado. Não há envio do arquivo para servidor.

Avisos de leitura inválida ou conflito precisam ser resolvidos antes de restaurar. Uma mudança externa detectada ao gravar preserva os dados salvos e deixa a cópia confirmada em memória, com o aviso existente. Se a gravação falhar, não feche a aba: tente salvar novamente ou baixe a lista desta aba. Cancelar não altera a compra. A comparação continua sequencial, sem exclusão mútua de escritas simultâneas. Critérios e limites em `qa/KNOWN_ISSUES.md`.

## Reutilizar uma lista
Na tela Pagamento, **Reutilizar esta lista** mantém os produtos, quantidades, orçamento, perfil da casa e escolha de marcas. Após confirmação, limpa as marcações de pego/não encontrado, o código anterior e a navegação da compra; volta à cesta em casa para revisar e editar. Cancelar mantém a compra atual. **Começar nova compra** continua apagando a cesta após confirmação.

Não arquiva compras nem confirma pagamento: é uma cópia de trabalho reutilizada no protótipo local, com o catálogo fictício atual. A persistência depende do armazenamento do navegador; não há sincronização ou integração de caixa. Critérios e testes em `qa/KNOWN_ISSUES.md`.

## Como rodar

Não precisa instalar nada:

```bash
git clone https://github.com/Dudu02170/poc-pila.git
cd poc-pila
# abra o index.html no navegador
```

## Equipe

Arthur Porcher · Eduardo Fernandes · Leonardo Rocha · Matheus Barreiro · Matheus Borges

## Tecnologias

HTML · CSS · JavaScript · localStorage · GitHub Pages
