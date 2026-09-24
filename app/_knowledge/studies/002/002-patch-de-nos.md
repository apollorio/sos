# 002 · Patch de nós — o que muda no texto que já existe

Só o que é decisão de conteúdo. Nó que não está aqui **fica**, até a poda da cauda motivacional (regra geral no fim).

Legenda: **CORTA** = sai de produção. **REESCREVE** = texto novo. **LIGA** = órfão que volta ao caminho. **NOVO** = nó que não existe.

Revisão clínica antes de publicar. Sem lista de método de suicídio. Sem dose para usar. Sem segunda substância.

---

## Componente compartilhado (substitui 9 cópias do parágrafo 4-6)

**`breath_46` — REESCREVE uma vez, os outros apontam para cá**

> Inspira pelo nariz, contando 4. Segura 1 ou 2. Solta pela boca, contando 6. Até 10 vezes. Se tontura, para e respira normal.

Tira “sistema parassimpático” do pico. Pode viver numa linha pequena “por que isso”, escondida, não no corpo do texto.

**`cold_hand` — REESCREVE** (hoje “baixa o coração de verdade / imediatamente”)

> Segura gelo na mão, ou água bem fria nos punhos, por uns 15 segundos. Se frio no rosto te faz mal ou te faz desmaiar, fica só na mão.

---

## Portão — NOVO `red_flag` (torto, panico, todos os atalhos)

> Alguma destas está acontecendo agora?
> - Dor ou aperto no peito, ou dor que desce pro braço, pescoço ou mandíbula
> - Convulsão, desmaio, ou não acorda direito
> - Respiração muito lenta, irregular, ou lábio / unha arroxeado
> - Muito calor e confusão, ou pele quente e a pessoa não faz sentido
> - Um lado do corpo fraco, boca torta, fala embolada

Botões: **“Sim, ou não tenho certeza”** → fluxo `samu`. **“Não, nenhuma”** → segue.

Não sei = sim.

---

## torto

| Nó | Ação | Texto / nota |
|---|---|---|
| `a3_stim` | LIGA dentro de `cool_down`, depois do portão. Deixa de ser órfão. | Corta “não colapsando” e “baixa de verdade”. |
| `fast_stim` | REESCREVE tarefas | 1. Para de se mexer sem parar. 2. Pano frio na nuca, axila ou atrás do joelho. Vento, sombra. 3. Se estiver acordado: goles pequenos ou isotônico. Não bebe litros. 4. Afasta o resto. Não soma calmante, álcool nem “mais uma”. 5. Se dor no peito, convulsão ou confusão com muito calor: a tela do 192 abre, não é caixinha. |
| `m3` | CORTA do caminho principal | Segunda água fria seguida é repetição. Fica como opção “ainda acelerado”. |
| `m7` | Aponta para `breath_46` | Não duplica o parágrafo. |
| `m9` / `harm_alcohol` | REESCREVE | Corta “1 copo (250 mL) por dose”. Novo: “Se estiver acordado e não vomitando: alguns goles e, se o estômago aceitar, qualquer comida. Se estiver apagando, vomitando dormindo, respiração lenta ou lábio roxo — não dá água. De lado e 192.” “Não dirige” fica. Preservativo fica, uma linha, sem sermão. |
| `harm_injection` | REESCREVE ordem | Primeiro o portão de respiração. Aula de seringa estéril só se a pessoa está acordada e estável — senão atrasa o 192. Mantém: não compartilha, não mistura depressores, respiração lenta = ligação. NOVO `naloxone_if` (abaixo). |
| `fast_psych` | Mantém a espinha | Troca o bloco por: uma mudança (som **ou** luz), frase “a percepção mudou, o chão não”, não luta. Doce na boca fica opcional, não obrigatório. |
| NOVO `ghb_down` | Se escolher “G / líquido / apagando” | “G com álcool apaga rápido. Se não responde ou vomita sem acordar: de lado, não dá nada pela boca, não deixa só, liga 192.” Sem ml, sem tempo de redose. |
| NOVO `urge_surf` | Botão em `m5` ou depois do atalho: “quero usar mais” | “A vontade é uma onda. Sobe e desce se você não alimentar. Fica 10 minutos: sente onde está no corpo, respira, não pega. Não é prova de caráter. É tempo.” HALT numa linha antes: fome, raiva, solidão, cansaço — uma coisa pequena primeiro. |
| NOVO `comedown_bridge` | Se o check for “caiu uma tristeza enorme” | “Essa queda, depois de estimulante ou festa, mente que a vida inteira é isso. O peso é real. A frase ‘para sempre’ não é. Dá para ir pro fluxo Solidão, ou ficar aqui até passar o pico da queda.” |
| `m6_worse` | REESCREVE | “Valeu por contar. Se piorou no corpo, o 192 é o passo. Se é o medo que piorou, eu fico.” |
| `action_samu` | Mantém os dois `tel:` | Tira qualquer promessa sobre polícia se um dia copiar a frase do `samu`. |
| `m12`–`m15` | FUNDE em um fecho | Uma tela: “Você ficou. Isso não apaga. O próximo minuto basta. 188 está aqui.” Botão extra: “fica mais um pouco” → música / set-and-setting. |
| `m11_no` | Mantém 188 | Barra de crise do fluxo inteiro, não só aqui. |

**`naloxone_if` — NOVO**

> Se a pessoa não acorda e a respiração está ruim: liga 192. Se alguém tiver naloxona e souber usar — e houver chance de opioide, mesmo que “não era pra ser” — aplica uma dose e fica. Espera uns 2–3 minutos. Se não voltar a respirar, repete se tiver. De lado. Não vai embora quando abrir o olho: o efeito passa. Naloxona não desfaz estimulante. No Brasil ela não está em toda esquina; se não tiver, o 192 ainda é o passo.

---

## panico

| Nó | Ação | Texto / nota |
|---|---|---|
| `a1` | O atalho e o “coração disparado” passam por `red_flag` | — |
| `a3_severe` | REESCREVE | Corta “seu corpo não está morrendo”. “Isso é muito desconfortável. Primeiro a gente olhou os sinais de emergência. Agora, gelo na mão.” |
| `m1` | REESCREVE | Corta “Você não está em perigo real” e “morte iminente”. Novo: “Sem os sinais de emergência, esse pico **costuma** ser alarme falso: o coração dispara sem perigo mortal. Não é garantia. Se aparecer dor no peito, desmaio ou falta de ar de verdade, a ligação está em cima.” |
| `fast_panic` | ENCURTA para 2 itens | Gelo na mão. Suspiro duplo ×3. O resto vira “ainda alto?”. |
| `breath_46` + `m2` + `mindfulness_5` + `m3` + `draw_distract` + `m4` + `box` | Deixa de ser fila obrigatória | Depois do suspiro: `anchor_3`. Se ainda alto, a pessoa escolhe humming **ou** box. Mindfulness e rabisco só em “fica mais”. |
| `m7` | REESCREVE | Só 3 coisas que vê + pés no chão. Narina alternada de 5 min sai do pico. |
| `m13` | Sobe | 188 antes do fecho motivacional, não na tela 18. |
| `m9` `m10` `m12` `m14` | FUNDE | Uma frase. A melhor que já existe pode ficar: “Não é fraqueza. É fisiologia.” — **depois** do portão, não antes. |

---

## realidade

| Nó | Ação | Texto / nota |
|---|---|---|
| `a2` | REESCREVE | Corta o nome diagnóstico da entrada. “As coisas parecem longe, ou você parece longe de você. É uma defesa do nervo. Incômoda, e em geral passa. Você está aqui. O chão está aqui.” Nome clínico só num “saber mais” no fim, se quiserem. |
| `redirect_panico` | LIGA | Nova escolha no `a1`: “Junto com isso o coração disparou e falta ar” → Pânico. |
| `m4` → mindfulness → `m5` | INSERE `breath_46` uma vez | Hoje o caminho “melhorou” quase não respira. |
| `m8` | REESCREVE | “Desconfortável, e na maior parte das vezes não é perigoso por si. Se veio com droga, calor, convulsão ou não conseguir acordar, isso já foi pro resgate.” |
| `m12` | REESCREVE | “Se puder, nas próximas horas vai mais leve com tela, barulho e cafeína. Não é regra. É alívio.” |

---

## trava

| Nó | Ação | Texto / nota |
|---|---|---|
| `a3_paranoia` | REESCREVE | Corta “não tem ninguém te olhando” como fato. “Essa sensação está muito real. Discutir com ela agora não ajuda. Vamos baixar uma coisa: luz, som, ou o quanto o ambiente entra no olho.” |
| `fast_trava` | REESCREVE a frase do SMS | Não promete “ninguém está focando em você”. Postura, capuz, e o script: “Estou sobrecarregado. O barulho piora. Isto passa.” |
| `reality_script` NOVO | Entre `m3` e `m4` | Tarefa: dizer em voz alta, se der: “Eu estou aqui. O som / a luz está alta. Por isso tudo parece ameaça. Isto passa.” |
| `m11` e `m14` | CORTA um | Ficam idênticos. `m14` vira o fecho único. `m11` sai. |
| `m8_yes` | Mantém CRT antes | Já está certo (`crt_before_sms`). Não manda SMS no susto. |
| `redirect_realidade` | REESCREVE sugestão | “Quer ir para Onde eu tô?” — igual à home. |
| `redirect` vindo de torto | idem | “Paranoia”, não “Travei”. |

---

## falar

| Nó | Ação | Texto / nota |
|---|---|---|
| `a1` | REESCREVE botões | “Muito só” → caminho solidão. “Pico: choro, raiva, vergonha” → TIPP curto. “Pensamento de acabar com a vida ou de me machucar” → `cssrs` (não journaling). “Usei algo” → `torto`. “Não sei se estou seguro no corpo” → `samu`. |
| `a2` | REESCREVE | “Valeu por contar.” Não “Obrigado”. |
| `a3_safe` | CORTA ou LIGA | Órfão. O conteúdo (CVV) já vive na barra e no fecho. Não precisa de nó morto. |
| `fast_ground` fg4 | REESCREVE | CVV sai da checklist. Vira botão de ação embaixo das tarefas de pés e água. |
| `m6_hard` | Mantém 188 + CAPS | CAPS só com lista verificada; até lá, só 188 e “CAPS pelo SUS, 24h em várias unidades — pede ajuda no 188 ou no 192 para te orientarem o mais perto”. Não inventa endereço. |
| `walk_ground` | MOVE | Sai de “ainda intenso”. Vira opção depois de baixar. No pico: aperta e solta o punho, 5 segundos, 3 vezes. |
| `m7` | Componente `breath_46` | — |
| `cognitive_reframe` | Mantém | É dos melhores. Não empilhar outro igual. |
| `journaling_deep` | Só no “fica mais” | Não no caminho de quem acabou de dizer que quer morrer. |
| `wa_from_yes` | Confere o template | O PLACEHOLDER não pode chegar na tela. Se o template falhar, o botão some, não abre `wa.me` vazio. |
| Fechos `m12`–`m15` | Um nó | — |
| NOVO porta **pico** | — | Gelo ou suspiro → punho → CRT 10 s (“não manda a mensagem ainda”) → “qual a palavra desse pico?” → gente ou 188. |
| Título fast | REESCREVE | “Você não está só.” Não “sozinho”. |

---

## samu

| Nó | Ação | Texto / nota |
|---|---|---|
| `instant_rescue` | REESCREVE | “Liga agora. Fala assim: preciso de socorro médico. A pessoa [não acorda / respira devagar / está muito quente e confusa / dor no peito / convulsão]. Estamos em [lugar]. Vou ficar na linha. Se tiver embalagem, guarda para a equipe. Não precisa contar história de crime.” **Corta** “não acionam a polícia por uso de drogas”. |
| `action_192` | LIGA depois da ligação, não antes | Órfão hoje. Vira a mesma fala, se a pessoa caiu no fluxo pelo caminho longo. |
| `a1` | LIGA como beat 1, nome `vendo_agora` | “O 192 já pode estar na linha. O que você está vendo?” Overdose/apagado · calor ou dor no peito · convulsão · queda · pânico acordado · boca torta / um lado fraco. |
| `m3_overdose` | REESCREVE | “De lado. Joelho de cima dobrado. Não dá água. Não sacode. Não deixa só. Se tiver naloxona e a respiração estiver ruim, alguém que saiba usa agora e avisa o SAMU.” |
| `m3_breathing` | REESCREVE | “Se não respira: pede pro SAMU te guiar na hora. Se você sabe fazer compressão no centro do peito, começa e segue a voz deles. Quando voltar a respirar, de lado.” Não escrever um curso de RCP errado. |
| NOVO `seizure` | — | “Não põe nada na boca. Não segura o corpo. Afasta o que machuca. Quando passar, de lado. Fica na linha.” |
| `m2_emotional` | LIGA no ramo “acordado em pânico” | Órfão. Vira `lighthouse`: “Estou aqui. Isso passa. Não vou a lugar nenhum.” Pergunta sim/não. Pede licença antes de tocar. |
| `a2_unsure` | REESCREVE | “Na dúvida, liga. Ninguém vai te julgar por isso.” Corta “Eles não se importam.” |
| `m10` | LIGA | Hoje morto. Entra depois que o socorro assume: 188 para quem cuidou + nota de CAPS sem lista falsa. |
| `m15` | REESCREVE | Tira o 💙 ou aceita emoji em todos os fechos. “Cuida de você também.” |
| `m1` | Mantém | “Você ligou. Isso importa.” é voz certa. |

---

## cssrs

| Nó | Ação | Texto / nota |
|---|---|---|
| `c1` | Quase igual | “Nos últimos 30 dias, você desejou estar morto ou dormir e não acordar?” |
| `c1_yes` | REESCREVE | Título e corpo: **3** ciclos, não 10. “Valeu por responder.” Não “Obrigado”. |
| `c2` | REESCREVE rota | “Você teve pensamentos de acabar com a própria vida?” **Não → `c6`, não para `coping_entry`.** Sim → segue `c3`. |
| `c3` | Mantém rota | “Você pensou em como seria?” Sem exemplos. |
| `c4` | Mantém | “Você teve esses pensamentos e alguma intenção de agir?” |
| `c5` | Documenta | “Você começou a organizar um plano?” Sim → `lethal_means` + 188/192 na mesma leva, sem pedir detalhes. A pressa dos meios é intencional. |
| `c6` | REESCREVE | “Nos últimos 3 meses, você fez, começou a fazer ou preparou alguma coisa para acabar com a própria vida?” Corta “se machucar”. Sem a lista de exemplos (comprimido, arma, lugar). Sim recente → emergente. Sim antigo → 188. Não → coping. |
| `lethal_means` | REESCREVE intro | “Vamos deixar mais longe, por agora, o que poderia te machucar. Não precisa jogar fora. Só não ficar na sua mão neste minuto.” Tarefas iguais: remédio noutro cômodo, objeto que corta ou arma com outra pessoa, sair de janela e varanda, sentar no chão. |
| `emergent_panel` | Mantém trava + 188 + 192 | — |
| `triggers_map` | REESCREVE | Antes de redirecionar: “Uma palavra do que disparou, se quiser. Pode ser ‘não sei’.” Aí sim `falar` ou `torto`. |
| NOVO `safety_micro` | Depois de `caps_nearby` / coping, se risco moderado+ | 4 linhas, uma por tela: “Qual sinal avisa que o pico voltou?” / “Uma coisa que você faz sem ninguém” / “Uma pessoa” / “188 e 192 já estão aqui”. |
| `hope_box` | Mantém | Não antes dos meios, se o risco é alto. |
| `redirect_falar` | REESCREVE | “Continuar em Solidão?” não “Tô sozinho”. |
| Entradas | NOVO atalho | A partir de torto, trava, realidade: um botão “pensamento de acabar com a vida” → este fluxo. Não só pelo `falar`. |

---

## Poda geral (todos os fluxos)

- Mais de um nó seguido só de “vai passar / você conseguiu / isso importa”: **deixa o melhor, corta o resto** para o botão “fica mais um pouco”.
- “Obrigado” → “Valeu por contar” em `torto.m6_worse`, `falar.a2`, `cssrs.c1_yes`.
- Redirects com nome que não é o da home: corrigir os três já achados na auditoria (Travei, Onde estou, Tô sozinho).
- Checklist que inclui “ligar 188”: vira botão.
- Qualquer frase nova com “sempre”, “de verdade”, “imediatamente”, “não está morrendo”, “a polícia não vem”: não entra.

## O que não patchar (está bom)

- `torto.m1`, `torto.a2_unclear`, `torto.m14` (vira o fecho, não a quarta moral).
- `falar.m2`, `falar.m9` (um dos dois no caminho curto, não os dois).
- `panico.m10` depois do portão.
- `trava.a3_freeze`.
- `realidade.a3_anchor`.
- `samu.m11` se o fluxo de cuidador continuar — é a melhor linha de quem ficou com o outro.
- Posição de recuperação, “não move quem caiu”, CRT antes do SMS, uma pergunta de C-SSRS por vez.
