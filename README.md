# Hacker Apocalypse Arena

Um battle royale local, feito com HTML, CSS e JavaScript puro. Os competidores são máquinas em conflito depois de um apocalipse hacker:

- Angry Computer
- Mad Cell-Phone
- Supa Tablet
- Medley Printer

## Como executar

O projeto não precisa instalar dependências externas. É necessário apenas ter o Node.js disponível.

1. Abra o terminal na pasta do projeto.
2. Execute:

```bash
npm start
```

3. Abra [http://localhost:3000](http://localhost:3000) no navegador.

Também é possível iniciar diretamente com:

```bash
node server.js
```

Para parar o servidor, pressione `Ctrl+C` no terminal.

## Modos de jogo

### Start fight

Você controla um campeão. Escolha o personagem nos cards e use o teclado ou os controles na tela.

### Watch mode

O computador controla todos os campeões. Use este modo para assistir à batalha automaticamente.

## Controles

- `W`, `A`, `S`, `D` ou setas: mover o campeão.
- `Space`: usar a habilidade especial.
- `R`: reiniciar a partida imediatamente.
- `Restart match` ou `New match`: iniciar outra partida.
- Cards dos campeões: trocar o personagem controlado.

No celular, use os botões direcionais exibidos abaixo do mapa.

## Regras

- Cada partida tem 3 rounds.
- O mapa tem 19x19 setores.
- A zona de corrupção diminui lentamente e causa dano fora da área segura.
- Ataques funcionam em linha reta e podem atingir adversários a distância, dependendo do alcance do campeão.
- Acertos, eliminações e sobrevivência no round geram pontos.
- Ao final do terceiro round, vence quem tiver mais pontos.
- Em caso de empate, vence primeiro quem estiver vivo, depois quem tiver mais HP e, por fim, o desempate alfabético.

## Recursos da interface

- Minimap com posição dos campeões, loot e zona perigosa.
- Tela de vencedor com ranking, pontuação e eliminações.
- Interface responsiva para desktop e celular.
- Efeitos sonoros nativos com Web Audio API, sem arquivos externos.

## Testes

Execute:

```bash
npm test
```

Os testes cobrem criação dos campeões, movimento, seleção, habilidades, loot e conclusão do torneio.

## Estrutura principal

```text
index.html       Interface e telas de início/vencedor
styles.css       Estilos responsivos e visuais da arena
src/game.js      Regras, combate, rounds e pontuação
src/main.js      Controle da interface e loop do jogo
src/audio.js     Efeitos sonoros usando APIs do navegador
server.js        Servidor HTTP local sem dependências
test/game.test.js Testes determinísticos do motor do jogo
```

## Segurança e dependências

- Nenhuma biblioteca é instalada automaticamente.
- O servidor serve apenas arquivos da pasta do projeto.
- O jogo roda localmente no navegador e não exige conta ou conexão com serviços externos.
