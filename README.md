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
