# 002 · Harm control — estratégia, fluxos e técnica

- **Data:** 2026-09-23
- **Escopo:** só estratégia, fluxo, conteúdo e técnica. Design fora.
- **Base:** os 191 nós atuais (auditoria 000) cruzados com harm reduction de campo (National Harm Reduction Coalition, DanceSafe / High Alert NZ, Zendo Project, SAMHSA, C-SSRS Columbia, Stanley-Brown) e com o que circula no X entre quem passa por isso — filtrado. O que é anedota perigosa está na seção **RECUSADO**.
- **Isto não é atendimento e não entra em produção sem revisão clínica.** Números de telefone, CAPS e a frase sobre polícia continuam pendentes de checagem local.

A tese, em uma linha: **o app de hoje acompanha bem e ensina pouco a não morrer.** Motivação é 15,7% dos nós. Redução de danos específica é 1,6%. O caminho curto até um “estou calmo” tem 16–22 telas. Quem está no pico não lê isso. O produto real é o **atalho + um portão de bandeira vermelha + uma técnica + uma voz humana**. O resto é companhia, e companhia é opt-in.

---

## 0. O que o X realmente entrega (e o que a academia não ouve)

Busca ampla em “harm reduction / bad trip / overamping / comedown / redução de danos” no X devolve muito lixo: propaganda, pergunta de via de uso, conselho de “toma mais uma coisa pra passar”. Isso é o ponto. Quem está dentro **não abre a boca no paper** — e quando abre no X, mistura ouro com veneno. O trabalho do app é separar.

### Fica (bate com evidência ou com sitter treinado)

| Sinal de campo | Onde | O que muda no fluxo |
|---|---|---|
| Gelo na mão fechada até doer “redireciona o sistema nervoso” — gente relatando que o terapeuta mandou e **funcionou no minuto** (set/2026). Suspiro fisiológico “reseta em menos de um minuto”. Box breathing citado como o que a pessoa realmente usa, não o que ela “sabe que existe”. | Pânico, pico, estimulante | Já temos água fria e suspiro, mas **enterrados numa fila de 9 técnicas**. Sobe para o beat 1–2, uma só. Gelo na mão é a variante segura para quem desmaia com água no rosto. |
| Frase de quem usa, não de manual: **dizer o óbvio em voz alta**. “Estou sob efeito. A TV está alta, por isso parece que falam de mim.” Não “ninguém está te olhando”. | `trava`, `fast_psych`, paranoia de estimulante | Novo cartão **script de realidade** (a pessoa fala, o app não discute o medo). |
| “Não enche de explicação. Farol: isso é temporário / eu estou aqui.” Bate com o princípio Zendo *sitting, not guiding* e *through, not down*. | Todos os `info` longos | Teto de ~25 palavras no pico. Pergunta aberta (“o que você precisa?”) vira **escolha de dois botões**. |
| Comedown descrito como luto instantâneo: “num segundo parece que acabaram de me contar que meu pai morreu”. | `torto` → ponte com `falar` | Nomear a **queda química**: o sentimento é real, a conclusão “para sempre” é o cérebro sem combustível. Sem dizer “não é nada”. |
| “Trabalhei 5 anos em redução de danos: as pessoas não usam naloxona porque dá medo. Empatia ajuda.” | `samu` + `torto` depressor | Um cartão curto, sem terror, sem aula. E sem fingir que no Rio todo mundo tem naloxona em casa (não tem — ver abaixo). |
| “Protect. Position. Stay.” Posição de recuperação, fica do lado, não dá água se não acorda. | `samu` | Já existe em `m3_overdose`. Sobe para **logo depois da ligação**, não 6 telas depois. |

### Recusado (aparece no X e em fórum de par, e mata)

| Conselho que circula | Por que não entra |
|---|---|
| “Toma um benzo pra descer” (até guia antigo de par nos EUA lista isso) | Mistura depressor com o que a pessoa já tomou. É como overdose de verdade começa. O app **não sugere segunda substância**. Nunca. |
| “Mais maconha / mais dose limpa o receptor” | Não é redução de dano. É uso. |
| Spray de magnésio “aborta bad trip” (post viral, set/2026) | Anedota. Sem protocolo, sem dose segura na crise. Não vira nó. |
| Comparar via oral vs inalada, redose, “quanto falta pra ficar liso” | Fora do escopo. O app não ensina a usar melhor. Ensina a **não morrer e não decidir a vida no pico**. |
| “Relaxa, você não vai morrer” **antes** de perguntar dor no peito / calor / convulsão | É o buraco C6 da auditoria. Gente no X em overamp descreve exatamente esses sintomas. |
| Lista de métodos na pergunta do C-SSRS (comprimido, arma, lugar alto) na tela da pessoa | A escala oficial traz exemplos **para o clínico**. Na tela de quem está em ideação, a lista vira menu. A pergunta fica. Os exemplos não. |

Zendo (princípios que o fluxo novo obedece): espaço seguro, **sentar sem guiar**, atravessar sem “baixar o santo” na marra, difícil não é automaticamente ruim. Toque só com permissão. Mudar **uma** coisa do ambiente, não cinco.

---

## 1. Veredito contra o que já existe

O que **não precisa de pesquisa nova** e está certo — não reinventar:

- Uma ação por beat. Botão de ligação `tel:` real (188 / 192 / 193).
- Acolhimento curto que não julga (“você abriu isso, já é um passo”).
- Água fria / reflexo de mergulho como TIPP-Temperatura — com a ressalva nova de quem desmaia fácil.
- Suspiro duplo, 4-6, box, humming, 5-4-3-2-1, pés no chão, canto quieto, música sem letra.
- Não discutir com a onda psicodélica. Aceitar “tô estranho agora”.
- Não mover quem caiu. Posição de recuperação. Não sacudir. Ficar na linha com o SAMU.
- C-SSRS escondido, uma pergunta por vez, pausa de corpo entre perguntas.
- Afastar meios (remédio, corte, altura) sem mandar jogar fora.
- Roteiro de mensagem pronta (“pode ficar na linha comigo?”).
- CRT de 10 segundos antes de mensagem ou de “mais uma”.

O que está **errado ou fraco** e a pesquisa fecha:

| # | Hoje | Ajuste |
|---|---|---|
| S1 | Nenhum portão de bandeira vermelha antes de “você não está em perigo real” / “não está morrendo” (`panico.m1`, `panico.a3_severe`, `torto.a3_stim`) | **Um nó só**, compartilhado, antes de qualquer acalmar. Sim → `samu`. Não → técnica. |
| S2 | `torto` sem barra de crise e o primeiro `tel:` no beat 8 | Barra 188/192 em `torto` sempre. Atalho começa no portão, não na água fria. |
| S3 | Água “à vontade” e “1 copo de 250 ml por dose” | **Corta o número.** MDMA + água sem sal mata por hiponatremia (High Alert NZ, Merck). Acordado e suando: golinhos ou isotônico, não litros. Quase dormindo / vômito: **não dá líquido**. |
| S4 | Calor de estimulante/MDMA só como “ventilador” dentro de `fast_stim` | Protocolo de esfriar de verdade: parar de se mexer, pano frio em nuca / axila / atrás do joelho, janela, sombra. Confuso + muito quente, ou ~40 °C, ou convulsão, ou dor no peito → **192 agora**. Não existe antídoto de estimulante. Naloxona **não reverte** estimulante. |
| S5 | `harm_injection` sem naloxona, sem “respiração lenta = 192” na cara | Cartão: não mistura depressores (álcool + benzo + opioide + G). Respiração lenta, irregular, lábio roxo, não acorda → lado + 192. **Se** houver naloxona e alguém souber usar (suspeita de opioide, inclusive comprimido que “não era opioide”), usa e continua a ligação. No Brasil a naloxona de levar para casa **não está regulamentada** como nos EUA (registro hospitalar/SUS, Revista CNJ 2025). O app não promete que a pessoa tem o spray. |
| S6 | G / GHB ausente | Não ensinar medida nem “espera 2 h pra redose” (isso é guia de uso). No app: G + álcool é emergência fácil; apagou, vômito, não responde → lado, não dá nada por boca, 192, não deixa sozinho. |
| S7 | C-SSRS `c6` pergunta “se machucar”; `c2 = Não` **pula** o comportamento e vai para coping; `c1_yes` diz 3 vezes no título e 10 no texto | Fidelidade Columbia: se a ideia ativa é não, **ainda pergunta o comportamento**. Texto: “acabar com a própria vida”, não “se machucar”. Sem lista de métodos na tela. Plano (`c5 = Sim`) pode ir direto para afastar meios — isso fica documentado como escolha, não como esquecimento. |
| S8 | Plano Stanley-Brown só tem o passo 6 (meios) | Microplano de 4 linhas **depois** da triagem, não no lugar dela: 1 sinal de alerta, 1 coisa que eu faço sozinho, 1 pessoa, profissionais (188/192/CAPS). `triggers_map` hoje só redireciona — passa a **guardar uma palavra**, não a dar aula. |
| S9 | `panico` faz 9 técnicas antes de ancorar; `falar` só respira no beat 10; `realidade` quase não respira no caminho “melhor” | Ordem de ouro no pico: **portão → 1 corpo → 1 respiração → 1 âncora → check → humano → pode parar**. Caminhada de 20 min é ativação de depressão, não TIPP. TIPP-Intenso no pico é 30–60 s (punho, escada, sacudir perna), não um passeio. |
| S10 | Cauda motivacional (4 das últimas 6 falas em `torto`; `trava.m11` = `trava.m14` copiados) | **Uma** frase de fechamento. O resto vira botão “fica mais um pouco” ou fecha. |
| S11 | “Eles não se importam” / “Obrigado” / “não está sozinho” / DSM na cara (`despersonalização`) | “Ninguém vai te julgar por ligar.” “Valeu por contar.” “Você não está só.” Experiência primeiro, nome clínico só se a pessoa pedir, no fim. |
| S12 | `samu` promete que **não acionam polícia** por uso | **Não publicamos essa garantia.** Protocolo do próprio SAMU em intoxicação é cena segura + regulação médica; polícia entra por violência, cena, ou decisão local — não dá para prometer do sofá. Frase nova abaixo. |
| S13 | CVV como item de checklist (`falar.fast_ground`) | Hotline é botão de ação, nunca caixinha “já fiz”. |
| S14 | Órfãos: triagem inteira do `samu`, `torto.a3_stim`, `falar.a3_safe`, `realidade.redirect_panico`, `samu.m10` | Ou entra no caminho ou sai. Ver fluxos v2. |
| S15 | “Set and setting” só como tarefa, nunca como ideia que a pessoa leva | Um cartão no **fim** da onda, não no pico: “o lugar, a luz, o som e quem está do lado mudam a onda. Isso serve na próxima também.” |
| S16 | Fissura / redose sem ferramenta | Urge surfing (Marlatt): a vontade é onda, sobe e desce em minutos se não alimentar. HALT numa linha (fome, raiva, solidão, cansaço) **antes** de “mais uma”. Já temos pausa de 10 s — ela vira a porta desse nó, não um enfeite. |

---

## 2. Regras de ouro do fluxo (o que “realista” quer dizer)

1. **Ligar é o primeiro pixel** quando o caso é corpo (não acorda, não respira direito, convulsão, dor no peito que espalha, muito quente e confuso, lábio roxo). Texto depois da ligação, nunca antes.
2. **Uma bandeira vermelha, dois botões**, em `torto`, `panico` e em todo “preciso de algo agora”. Sem isso o atalho é irresponsável.
3. **No pico, no máximo 6 beats até “pode fechar”.** O caminho longo existe como “fica comigo”, não como obrigação.
4. **Uma técnica por tela.** A fila de água + suspiro + humming + box + 5-4-3-2-1 + narina alternada é fadiga, não cuidado. A pessoa escolhe a próxima se a anterior não mexeu.
5. **Não discutir a realidade dela.** Medo de estar sendo olhado: baixar uma coisa do ambiente e uma frase que ela mesma diz. Não “é paranoia, para”.
6. **Não oferecer droga para consertar droga.** Nem benzo, nem álcool, nem “mais um pouco”, nem 5-HTP no mesmo dia de MDMA (risco de síndrome serotoninérgica — isso é nota clínica, não tarefa de usuário).
7. **Frase de farol, repetível:** “Estou aqui. Isso sobe e desce. O próximo minuto basta.”
8. **Toque só com permissão** — vale para o app (não manda abraçar o outro) e para o fluxo resgate.
9. **Companhia humana não é prêmio de quem “melhorou”.** 188 aparece no meio, não só no slide de tchau.
10. **O que for número, endereço ou promessa legal fica atrás de `verified_at`.** Até lá, 188 e 192 e 193. CAPS sem lista inventada.

### O que dizer no telefone do SAMU (substitui a frase da polícia)

> “Preciso de socorro médico agora. A pessoa [não acorda / respira devagar / está muito quente e confusa / dor no peito / convulsão]. Estamos em [lugar]. Vou ficar na linha.”

Não precisa narrar crime, quantidade nem “o que era”. Se tiver embalagem, guarda para a equipe. O trabalho do 192 é urgência médica. **Não prometemos o que a viatura faz.**

### Bandeira vermelha (nó único `red_flag`)

Pergunta, linguagem de quem está tonto:

> “Alguma destas está acontecendo **agora**?”
> - Dor ou aperto no peito, dor que vai pro braço, pescoço ou mandíbula
> - Convulsão, desmaio, ou não consegue acordar direito
> - Respiração muito lenta, irregular, ou lábio/unha arroxeado
> - Muito calor no corpo **e** confusão, ou pele muito quente e a pessoa não faz sentido
> - Fraqueza de um lado do corpo, boca torta, fala embolada (AVC)

**Sim, qualquer uma** → `samu` (ligação já na tela).  
**Não, nenhuma** → segue a técnica.  
**Não sei** → trata como sim. Na dúvida, liga. O SAMU existe para avaliar.

Ressalva de pânico, só **depois** do não: “Quando não tem nenhum desses sinais, coração disparado **costuma** ser alarme falso. Não é garantia. Se mudar, a ligação continua aqui.”

Ressalva da água fria, uma vez, no componente compartilhado: “Se você desmaia fácil com frio no rosto, não joga água na cara. Segura gelo na mão.”

---

## 3. Ferramentas que valem um nó (biblioteca, não copy-paste)

Um componente, muitos fluxos. O parágrafo 4-6-10 hoje está colado em 9 nós — vira `breath_46` e pronto.

| ID | Quando | Ação (uma) | Não fazer |
|---|---|---|---|
| `red_flag` | Antes de acalmar em droga, pânico, atalho | 2 botões | Texto de “você está seguro” antes |
| `cold_hand` | Pânico, pico, estimulante, dissociação | Gelo ou água fria na **mão** 15–20 s, ou rosto se a pessoa aguenta | Prometer “baixa o coração de verdade / na hora” |
| `sigh` | Pânico, primeiro corpo | 2 puxadas pelo nariz + solta tudo pela boca. 3 vezes | 10 técnicas em seguida |
| `breath_46` | Depois que o corpo baixou um grau | 4 inspira, 1–2 segura, 6 solta. Até 10. Tontura → para | Copiar o parágrafo de novo |
| `box` | Ainda alto depois do 4-6, ou intenção ativa no C-SSRS | 4-4-4-4, 4 voltas | Usar como única ferramenta de overdose |
| `hum` | Pânico, vagal | Boca fechada, “hmm” 15 s, sentir o peito | — |
| `anchor_3` | Dissociação, bad trip, depois do corpo | 3 coisas que vê + 1 textura na mão + pés no chão | 5-4-3-2-1 inteiro no primeiro minuto |
| `one_change` | Psicodélico, paranoia, overamp mental | Muda **uma**: luz, som, ou cômodo | Reforma do ambiente |
| `reality_script` | Paranoia, estimulante, “estão falando de mim” | A pessoa repete: “Estou sob efeito. Isto passa. O som alto piora.” | “Ninguém está te olhando” como fato |
| `cool_down` | Estimulante, MDMA, pele quente | Parar de dançar/andar agitado. Pano frio: nuca, axila, atrás do joelho. Vento. Sombra. Golinhos ou isotônico **se acordado** | Litros de água. Naloxona achando que reverte anfetamina |
| `no_mix` | Álcool, G, benzo, opioide, injeção | Não soma outro depressor. Não redosa “pra ajustar” | Sugerir benzo pra descer |
| `recovery` | Não acorda mas respira | De lado (esquerdo se der), joelho de cima dobrado, não dá água, não deixa só | Sacudir, café, banho frio forçado, dedo na boca na convulsão |
| `naloxone_if` | Não acorda + respiração ruim + suspeita de opioide (inclusive pó/comprimido duvidoso) | Se tiver spray e alguém souber: uma dose, liga 192, espera 2–3 min, pode repetir, fica até o fim. Posição de lado | Aula de injeção. Prometer que há naloxona na esquina. Achar que resolve estimulante puro |
| `urge_surf` | “Quero mais uma agora” | Nota a vontade no corpo. Respira. 10 min sem alimentar. Onda desce sem vitória heroica | Sermão de abstinência |
| `halt` | Antes de redose ou de mandar a mensagem explosiva | Fome, raiva, solidão ou cansaço? Uma coisa pequena primeiro (água, comida, banho, espera) | Questionário de 20 itens |
| `crt_10` | Mensagem, redose, decisão grande | 10 segundos. Dois pensamentos. | — |
| `butterfly` | Trava / freeze, se o toque próprio for ok | Braços cruzados, toque alternado nos ombros, devagar | Mandar o amigo abraçar sem pedir |
| `micro_move` | Freeze | Dedo do pé, um lado e outro. Só isso | “Levanta e caminha 20 min” no auge |
| `lighthouse` | Qualquer pico, e o fluxo resgate se a pessoa está acordada | “Estou aqui. Isso passa. Não vou a lugar nenhum.” Uma frase. Pergunta de sim/não, não aberta | Palestra, “se acalma”, “pensa positivo” |
| `hope_micro` | Depois do C-SSRS, não no lugar dele | 1 foto, ou 1 razão pequena para as próximas horas, ou 1 mensagem antiga | “Lista 10 motivos” |
| `safety_micro` | Risco moderado ou mais, depois dos meios | 4 linhas: sinal, o que eu faço só, quem eu chamo, 188/192 | Pedir para descrever o método |
| `set_setting_later` | Só no fechamento da onda | Uma frase para levar: lugar, luz, som, companhia | Aula no minuto do pico |
| `comedown_bridge` | Tristeza súbita depois de estimulante/MDMA/álcool | “A queda mente que isso é a vida inteira. O peso é real. A frase ‘para sempre’ não é.” Ponte para `falar` se quiser | “É só químico, ignora” |

**Imagem ou vídeo, se for fazer (sem autoplay com som):**

- 3 quadros: posição de recuperação.
- 1 desenho: onde por o pano frio (nuca, axila, atrás do joelho). Sem virilha — em app público vira constrangimento e ninguém precisa disso para a primeira ação.
- 15 s sem fala: suspiro duplo, contado na tela.
- Orb que já existe para o 4-6. Não vídeo de uso, não imagem de método, não depoimento dramático.

**Áudio:** off até a pessoa pedir. Som no banheiro ou na rua denuncia.

---

## 4. Formato de cada fluxo v2

Legenda comum: `RF` = passa pelo `red_flag`. `PARAR` = a pessoa pode fechar com 188 na tela. O caminho “fica” é opcional e curto.

Contagem alvo de beats **obrigatórios** até poder parar:

| Fluxo | Hoje (caminho curto até o fim) | v2 até “pode parar” |
|---|---|---|
| torto | 16 | 5–7 (depois do portão) |
| panico | 20 | 5–6 |
| realidade | 18 | 6 |
| trava | 17 | 6 |
| falar | 22 | 6 (triagem + 1 corpo + 1 gente + fecho) |
| samu | 16, ligação no 0 mas o cuidado útil vem tarde | ligação no 0, cuidado no beat 1 |
| cssrs | sem fim, e fura a pergunta 6 | pergunta 6 sempre que a ideia ativa for não; fim com microplano |

Arquivos desenhados: `fluxos-v2/`.

### torto · Bateu forte

Entra → o que é agora (estimulante / psicodélico / álcool / G ou depressor / injeção / não usei nada / não sei).  
“Usei e tá pesado” e o atalho **não pulam** o portão.

- Estimulante ou MDMA: `red_flag` → `cool_down` → `one_change` → `reality_script` → check. Piorou → 192. Quero mais → `halt` + `urge_surf` (sem sermão).
- Psicodélico: `red_flag` rápido (convulsão / não acorda ainda conta) → `lighthouse` + `one_change` → `anchor_3` → não luta com a onda → pessoa de confiança ou 188.
- Álcool acordado: comida se o estômago aceita, golinhos, não dirige, não soma benzo/G/opioide. Sem “250 ml por dose”.
- Álcool ou G ou depressor **apagando**: nem passa pelo fluxo de conversa. `recovery` + 192 + `naloxone_if` se opioide for possível.
- Injeção: estéril e não compartilha (uma linha, não um curso), não mistura depressor, respiração. Se já usou e está mal, o portão vem **antes** da aula de seringa. Aula no pico é atraso.
- Não usei nada → `panico`.
- Não sei → `lighthouse` + portão + `cold_hand`. Não força categoria.

Comedown chorando depois → `comedown_bridge` → pode ir para `falar`.

### panico

`red_flag` → escolha de **uma**: gelo na mão **ou** suspiro 3× → frase condicional (alarme falso **se** passou no portão) → `anchor_3` (não o 5-4-3-2-1 completo) → check.  
Ainda alto: humming **ou** box, a pessoa escolhe.  
188 no meio. Fecha.  
“Fica mais” = mindfulness de 5 min, não mais quatro exercícios obrigatórios.

Tira do caminho principal: água fria repetida (`m4` depois de já ter feito), narina alternada de 5 min, “você não está em perigo real” sem portão.

### realidade

Sem diagnóstico na entrada. “Parece filme / você parece longe. É o nervo se protegendo. Chão existe.”  
Toque na roupa → nomeia 3 → gelo na mão → **uma** `breath_46` (hoje falta no caminho) → micro movimento → alguém por perto ou 188.  
Se coração disparou junto → `panico` (liga o órfão `redirect_panico`).  
Se usou algo → `torto`.

### trava

Não afirma “ninguém te olha”. “A sensação é real. Vamos baixar **uma** coisa.”  
Parede / capuz / olhar no chão → `reality_script` → `micro_move` ou `butterfly` → check.  
Gente: CRT 10 s **antes** do SMS. Sem gente: 188, não como tarefa riscada.  
Corta o nó duplicado. Caminho “tudo irreal” → `realidade`. Caminho “falta de ar” → `panico` (já existe).

### falar · solidão, depressão, pico de emoção

Um fluxo, três portas (não precisa de sétimo botão na home para a estratégia existir):

1. **Sozinho / vazio** — uma validação (`m1`/`m9` são o melhor texto do app, fica um deles, não os dois). HALT numa linha. Mensagem pronta ou 188. Uma coisa pequena para a próxima hora. Sono só se for hora de dormir. Para.
2. **Pico** (choro, raiva, vergonha, desespero sem plano) — `cold_hand` ou `sigh` → punho aperta-e-solta 5 s → **não manda a mensagem ainda** (`crt_10`) → nomeia o sentimento numa palavra → aí sim gente ou 188.
3. **Pensamento de acabar / me machucar** — não faz journaling primeiro. Vai para `cssrs`. O botão “me machucar” pode ser NSSI; a triagem distingue, não o botão da home.

Caminhada de 15–20 min sai do pico e fica como opção **depois** de baixar, no “fica mais”.  
CVV sai do checklist.  
“Obrigado” sai. “Você não está só” no lugar de “sozinho”.

Depressão aqui não é terapia. É: não decidir a vida hoje, uma ação oposta minúscula (cortina, água, uma frase pra alguém), e triagem se aparecer ideação. Repetir “você merece” quatro vezes não é técnica.

### samu · resgate

Beat 0 continua sendo a ligação. Em seguida, **o que você está vendo** (a triagem órfã volta, mas **depois** do 192, como guia enquanto espera):

- Não acorda / respiração ruim → `recovery` + `naloxone_if` + fica na linha. Não dá água.
- Muito quente, agitado, dor no peito → para, esfria, não segura à força, não discute. 192 já foi discado.
- Convulsão → não põe nada na boca, não segura o corpo, afasta objetos, lado quando parar, 192 na linha.
- Caiu → não move.
- Acordado, pânico ou medo → `lighthouse`, permissão antes de tocar, uma mudança de ambiente.
- Boca torta / um lado fraco → fala isso para o SAMU (AVC).

Cuidador: 3 respirações **no** caminho (o `m10` órfão entra aqui, não como slide perdido). “Você também pode ligar 188 depois.”  
Frase da polícia: trocada pela fala do telefone (seção 2).  
`alertBox` de “preso no alto” continua, curto, sem romance.

### cssrs

Ordem Columbia de tela (ideação no último mês, comportamento nos últimos 3 meses):

1. Desejou estar morto ou dormir e não acordar?
2. Teve pensamentos de acabar com a própria vida?
   - **Não → pergunta 6 mesmo assim** (hoje o app erra aqui).
3. Pensou em como?
4. Teve intenção de agir?
5. Começou a organizar ou organizar um plano?
   - Sim → afasta meios **na hora** + 188/192. Não faz a pessoa descrever o plano. A pergunta 6 não segura os meios; pode vir depois, curta, ou ficar coberta se já está em emergente.
6. Nos últimos 3 meses, fez, começou ou preparou alguma coisa para **acabar com a própria vida**?
   - Sim, recente → painel emergente (trava a fuga fácil) + meios + 188/192.
   - Sim, faz tempo → 188 + segue.
   - Não → coping.

Entre perguntas: uma respiração **curta de verdade** (3 ciclos, e o texto diz 3). Gelo entre as perguntas fica, é boa prática deste app — não corta.

Depois: `safety_micro` (4 linhas) e `hope_micro`. `triggers_map` pede **uma palavra** (“o que disparou”) e só então oferece `falar` ou `torto`. Não redireciona no automático sem a pessoa escrever.

Sem exemplos de método na pergunta. “Meios letais” sai. Entra: “Vamos deixar mais longe, por agora, o que poderia te machucar.”

Quem pode abrir a triagem: não só `falar`. Também o portão, se a pessoa disser que quer morrer, a partir de `torto` / `trava` / `realidade`. Um botão, não uma entrevista escondida no quinto fluxo.

---

## 5. Voz (curto, para quem for reescrever)

- Você, nunca tu. Já está certo.
- Sem “Obrigado”. “Valeu por contar.” ou “Isso importa.”
- “..” pode ficar como a voz da casa — decide e documenta. Leitor de tela lê estranho; se manter, que seja escolha, não caco.
- Sem absoluto: “sempre”, “de verdade”, “na hora”, “não está morrendo”, “não aciona a polícia”.
- Sem segunda substância.
- Sem emoji solto num fluxo só (o 💙 de `samu.m15` ou entra em todos os fechos ou sai).
- Rótulos iguais em todo lugar: Bateu forte, Pânico, Onde eu tô?, Paranoia, Solidão, Resgate. “Travei”, “Onde estou?”, “Tô sozinho” são apelidos — não usar no botão de redirect.
- Teto no pico: 25 palavras. Tarefa: um verbo.

---

## 6. Ordem de mudança (só conteúdo)

1. Criar `red_flag` e colocar na frente de `torto`, `panico` e dos cinco atalhos. Enquanto isso não existe, **apagar** as frases absolutas de segurança.
2. Corrigir C-SSRS (`c2 não` → `c6`; texto “acabar com a própria vida”; 3 ciclos = 3 ciclos; sem lista de métodos).
3. Trocar a frase da polícia. Trocar “250 ml por dose”. Trocar água ilimitada no contexto MDMA/estimulante pelo cartão `cool_down`.
4. Barra 188/192 dentro de `torto`.
5. Ligar ou apagar órfãos. Desduplicar `trava.m11`/`m14`. CVV deixa de ser checkbox.
6. Encurtar cada caminho principal até o “pode parar” da tabela. Cauda motivacional vira um nó.
7. Adicionar `comedown_bridge`, `urge_surf`, `no_mix`, `naloxone_if`, `safety_micro`, `reality_script`.
8. Lista de CAPS continua escondida até alguém verificar endereço e telefone no chão. CAPS não é hospital.
9. Clínico assina: portão, naloxona no contexto BR, G, calor, C-SSRS, frase do SAMU.

Nada disso depende de redesign. É JSON e frase.

---

## 7. Fontes que seguram o ajuste

- National Harm Reduction Coalition — *Recognizing / Responding to Stimulant Overamping*: calor, convulsão, AVC, dor no peito; esfriar com pano em axila, atrás do joelho, testa; não segurar convulsão; nada na boca. Naloxona não é antídoto de estimulante.
- High Alert NZ / Merck — MDMA: hipertermia e hiponatremia. ~250 ml/hora se estiver ativo, menos se parado, com eletrólito. Não “beba o máximo”.
- ADF (Austrália) — GHB: margem estreita, não misturar com álcool, apagar e vômito = emergência. O app usa o **perigo**, não o tutorial de mililitro.
- SAMHSA / CDC — opioide: não acorda, respiração lenta, pupila pontual, lábio roxo → 192, naloxona se houver, de lado, fica. Repetir em 2–3 min se precisar. Efeito acaba; a emergência não acaba quando a pessoa abre o olho.
- Zendo Project — 4 princípios; permissão para tocar; frase curta; mudar o corpo ou o cômodo.
- Columbia C-SSRS Screener (recent): Q1–Q2 no mês; se Q2 = não, vai para comportamento; Q6 “end your life”, janela de 3 meses. SAFE-T 2026 confirma.
- Stanley & Brown — seis passos; aqui cabem quatro linhas depois da crise aguda, mais meios.
- Marlatt — urge surfing, onda de minutos, não de caráter.
- Protocolo SAMU (suporte básico, intoxicação por droga de abuso): manejo verbal se acordado e colaborativo; regulação se agitado; não é um panfleto de “polícia nunca”.
- Brasil, naloxona: RENAME / uso em serviço, take-home sem norma federal equivalente ao modelo EUA (revisão CNJ 2025). Não copiar caixa de Narcan da esquina americana para Copacabana.
- X, uso filtrado: gelo na mão e suspiro como o que a pessoa **faz** (não o que ela reposta); script do óbvio em voz alta; medo da naloxona; comedown como luto súbito. Recusados listados na seção 0.

Fluxos desenhados no padrão dos `.mmd` originais: `fluxos-v2/`.
Patch nó a nó do que muda de verdade: `002-patch-de-nos.md`.
