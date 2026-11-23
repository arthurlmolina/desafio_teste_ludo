# desafio_teste_ludo

Desafio: **Ludo para 2 jogadores**. Implementação e casos de teste automatizados escritos em **JavaScript** para testar **JavaScript** usando o executor nativo `node:test`.

## Especificação

- **Tabuleiro e peças:** **2 jogadores** em lados opostos (`START = [0, 26]`), **4 peças** cada, percurso circular comum de **52 casas** (`0..50` relativo) e reta final exclusiva de **6 posições** (`51..55` reta final, `56` chegada).
- **Saída da base:** Peças iniciam na base (`-1`) e só entram na pista (`0`) ao tirar **6** no dado.
- **Capturas e casas seguras:** Cair na mesma casa absoluta de uma peça adversária fora das **casas seguras** (`SAFE = [0, 8, 13, 21, 26, 34, 39, 47]`) captura a peça oponente (enviando-a de volta para `-1`) e concede jogada extra.
- **Turnos extras e chegada:** Tirar **6**, capturar adversário ou alcançar a chegada (`56`) garante jogada extra. A chegada exige rolagem **exata**; sem movimentos legais, a vez passa automaticamente. Vence quem levar as 4 peças à chegada.

## Como rodar

```bash
npm install
npm test            # executa os 21 casos de teste
npm run coverage    # executa os testes com relatório de cobertura (100% em linhas, branches e funções do código-fonte)
```

Estrutura do repositório: `src/ludo.js` (implementação) e `tests/ludo.test.js` (suíte de testes).

## Funcionamento dos casos de teste

A suíte contém **21 testes automatizados** executados com `node:test` e asserções locais. Os CT01–CT19 cobrem estado inicial, dado, saída da base, movimentos, turnos, capturas, casas seguras e vitória; os CT20–CT21 verificam as validações de entradas e parâmetros. O gerador `rng` e as posições iniciais são controlados para tornar os cenários reproduzíveis.

### Especificação Detalhada dos Casos de Teste

---

#### Caso de Teste 1 — Estado Inicial e Rolagem de Dado (`CT01` e `CT02`)
- **Descrição:** Verificar se a partida inicia com 2 jogadores, 4 peças na base (`-1`) cada e se o gerador padrão de dado produz exclusivamente inteiros de 1 a 6.
- **Pré-condições:** Classe `LudoGame` importada.
- **Passos:**
  1. Instanciar `new LudoGame()` e verificar `positions`, `turn` e `status`.
  2. Executar 300 rolagens com `Math.random` padrão e coletar os valores distintos gerados.
- **Cenários:**
  - **CT01 — Estado inicial padrão:** Resultado Esperado: `positions` igual a `[[-1,-1,-1,-1], [-1,-1,-1,-1]]`, `turn === 0` e `status === 'playing'`.
  - **CT02 — Domínio do dado (1 a 6):** Dados: 300 execuções de `roll()` | Resultado Esperado: conjunto ordenado de valores igual a `[1, 2, 3, 4, 5, 6]`.

---

#### Caso de Teste 2 — Saída da Base (`CT03` a `CT06`)
- **Descrição:** Validar a regra de saída da base: retenção das peças e passagem de turno sem `6`, liberação de todas as peças da base com `6` e concessão de turno extra.
- **Pré-condições:** Partida criada com `rng` determinístico (`dice(...)`).
- **Passos:**
  1. Rolar dado `3` com todas as peças na base e verificar `moves`, `turn` e `positions`.
  2. Rolar dado `6` com todas as peças na base e verificar `moves` e resultado de `move(2)`.
  3. Configurar peças `[-1, 5, -1, -1]`, rolar `3` e tentar mover a peça `0` (na base).
- **Cenários:**
  - **CT03 — Sem 6 na base:** Dados: `rng: dice(3)` | Resultado Esperado: `moves` vazio (`[]`), `turn` passa para `1` e peças permanecem em `-1`.
  - **CT04 — Opções com 6 na base:** Dados: `rng: dice(6)` | Resultado Esperado: `moves` retorna `[0, 1, 2, 3]`.
  - **CT05 — Saída e turno extra:** Dados: `rng: dice(6)`, ação `move(2)` | Resultado Esperado: `positions[0][2] === 0`, `extraTurn === true` e `turn === 0`.
  - **CT06 — Bloqueio de peça na base sem 6:** Dados: `positions: [[-1, 5, -1, -1], ...]`, `dice(3)`, `move(0)` | Resultado Esperado: apenas peça `1` é legal e `move(0)` lança erro `'inválido'`.

---

#### Caso de Teste 3 — Movimentação, Coordenadas Absolutas e Controle de Turnos (`CT07` a `CT11`, `CT19`)
- **Descrição:** Validar avanço na pista, ordem obrigatória `roll()` -> `move()`, turno extra ao tirar 6 na pista, conversão de coordenadas absolutas (incluindo saída do jogador 2 na casa 26) e validação de índice de peça.
- **Pré-condições:** Partida configurada com posições conhecidas.
- **Passos:**
  1. Mover peça na posição `10` com dado `4` e verificar nova posição e passagem de turno.
  2. Tentar chamar `move(0)` antes de `roll()`, chamar `roll()` duas vezes seguidas e chamar `move(7)` (peça inexistente).
  3. Mover peça na pista com dado `6` e verificar manutenção do turno.
  4. Consultar `absolute(1, 0)`, `absolute(1, 30)` e `absolute(0, 51)`.
- **Cenários:**
  - **CT07 — Avanço simples e troca de turno:** Dados: posição `10`, `dice(4)` | Resultado Esperado: posição `14`, `extraTurn === false` e `turn === 1`.
  - **CT08 — Mover sem rolar:** Dados: `new LudoGame().move(0)` | Resultado Esperado: lança erro `'Role'`.
  - **CT09 — Rolar duas vezes seguidas:** Dados: `roll()` seguido de `roll()` | Resultado Esperado: lança erro `'Mova'`.
  - **CT10 — Dado 6 na pista:** Dados: posição `10`, `dice(6)`, `move(0)` | Resultado Esperado: `turn` permanece `0`.
  - **CT11 — Coordenadas absolutas do Jogador 2:** Dados: `turn: 1` | Resultado Esperado: `absolute(1, 0) === 26`, `absolute(1, 30) === 4` (volta completa) e `absolute(0, 51) === null` (reta final).
  - **CT19 — Peça inexistente:** Dados: `move(7)` após `roll()` | Resultado Esperado: lança erro `'inválido'`.

---

#### Caso de Teste 4 — Capturas e Casas Seguras (`CT12` a `CT15`)
- **Descrição:** Verificar captura de peça adversária em casa comum, proteção em casas seguras (`SAFE`), convivência de peças do mesmo jogador e imunidade na reta final.
- **Pré-condições:** Peças posicionadas para colisão controlada no percurso.
- **Passos:**
  1. Mover peça do Jogador 0 de `2` para `5` (casa comum) ocupada pela peça do Jogador 1 (`rel 31 -> abs 5`).
  2. Mover peça do Jogador 0 de `5` para `8` (`abs 8`, casa segura) ocupada pela peça do Jogador 1 (`rel 34 -> abs 8`).
  3. Mover peça própria para casa já ocupada por outra peça do mesmo jogador.
  4. Avançar peça para a reta final (`rel 52`) e verificar mapeamento absoluto.
- **Cenários:**
  - **CT12 — Captura em casa comum:** Dados: J0 em `2`, J1 em `31`, `dice(3)` | Resultado Esperado: `captured === 1`, `positions[1][0] === -1` e `turn === 0` (jogada extra).
  - **CT13 — Proteção em casa segura:** Dados: J0 em `5`, J1 em `34` (`abs 8`), `dice(3)` | Resultado Esperado: `captured === 0` e peça de J1 permanece em `34`.
  - **CT14 — Peça própria na mesma casa:** Dados: J0 com peças em `2` e `5`, `dice(3)` | Resultado Esperado: `captured === 0` e ambas permanecem em `5`.
  - **CT15 — Imunidade na reta final:** Dados: J0 em `48`, `dice(4)` | Resultado Esperado: posição `52` e `absolute(0, 52) === null`.

---

#### Caso de Teste 5 — Chegada Exata e Condição de Vitória (`CT16` a `CT18`)
- **Descrição:** Validar exigência de valor exato para entrar na casa `56`, jogada extra ao concluir uma peça e encerramento da partida ao completar as 4 peças.
- **Pré-condições:** Peças posicionadas próximas à chegada (`50` ou `55`).
- **Passos:**
  1. Com peça em `55`, rolar `2` (`55 + 2 > 56`) e verificar `moves` e troca de turno.
  2. Com peça em `55`, rolar `1` e executar `move(0)`.
  3. Com três peças em `56` e uma em `50`, rolar `6`, mover a quarta peça e tentar rolar novamente.
- **Cenários:**
  - **CT16 — Ultrapassagem bloqueada:** Dados: `positions: [[55, 56, 56, 56], ...]`, `dice(2)` | Resultado Esperado: `moves` vazio (`[]`) e `turn` passa para `1`.
  - **CT17 — Chegada com valor exato:** Dados: peça em `55`, `dice(1)`, `move(0)` | Resultado Esperado: posição igual a `FINISH` (`56`) e `extraTurn === true`.
  - **CT18 — Vitória e trava do jogo:** Dados: `[[56, 56, 56, 50], ...]`, `dice(6)`, `move(3)` | Resultado Esperado: `status === 'finished'`, `winner === 0` e `roll()` subsequente lança erro `'terminou'`.

## Execução e cobertura de código

Os testes usam o executor nativo `node:test`, incluído no Node.js, sem dependências externas. Execute `npm test` para rodar a suíte e `npm run coverage` para medir o código-fonte em `src/`. O comando de cobertura exige 100% de linhas, decisões (branches) e funções; se algum desses limites não for atingido, o comando termina com falha. Os arquivos auxiliares de teste não entram no cálculo, pois a métrica solicitada é a cobertura da implementação do desafio.

A suíte contém **21 testes automatizados**. Além dos cenários CT numerados, foram acrescentadas verificações de entradas inválidas, limites e fluxos alternativos.

### Testes complementares de robustez

Além dos cenários detalhados acima, foram adicionados: CT20–CT21: validação das posições iniciais, turno, gerador aleatório, jogador e valor do dado.

A cobertura é calculada somente sobre os arquivos de implementação em `src/`, não sobre o próprio código auxiliar usado pelos testes. O comando de cobertura exige simultaneamente **100% de linhas, 100% de branches e 100% de funções**; qualquer percentual abaixo disso faz o comando falhar.

## Colaboradores

| Nome | RA |
|---|---|
| Arthur Lavagnolli Molina | 24031565-2 |
| Gustavo dos Santos Guimarães | 24000191-2 |
