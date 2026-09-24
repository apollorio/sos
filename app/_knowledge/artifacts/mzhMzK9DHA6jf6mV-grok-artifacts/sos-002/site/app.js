(function () {
  const KIND = {
    choice: "Escolha",
    info: "Texto",
    task: "Tarefa",
    action: "Ligação",
    end: "Pode fechar",
  };

  const nav = [
    ["tese", "Como fala"],
    ["rua", "Do X, na prática"],
    ["campo", "O que a gente usa"],
    ["amigo", "Fluxo · Tô com alguém"],
    ["furos", "O que muda"],
    ["regras", "Regras"],
    ["ferramentas", "Ferramentas"],
    ["ordem", "Ordem de mudança"],
    ["patch", "Patch de nós"],
    ["mapa", "Mapa"],
    ["torto", "Fluxo · Bateu forte"],
    ["panico", "Fluxo · Pânico"],
    ["realidade", "Fluxo · Onde eu tô"],
    ["trava", "Fluxo · Paranoia"],
    ["falar", "Fluxo · Solidão"],
    ["samu", "Fluxo · Resgate"],
    ["cssrs", "Fluxo · Pergunta direta"],
  ];

  const tools = [
    ["gelo_punho", "Pânico, pico, onda. O que mais se repete.", "Gelo no punho até doer. Não é símbolo. É pra puxar a atenção do peito pro frio."],
    ["rosto", "Quando a mão não chega.", "Água fria no rosto. Para se a pessoa pode cair."],
    ["suspiro", "Quando o gelo não tem.", "Duas puxadas pelo nariz, solta tudo pela boca. Três ou quatro. Menos de um minuto."],
    ["junto", "Quem tá do lado.", "Respira no mesmo tempo. Conta devagar. Não entra em pânico junto."],
    ["frase", "Qualquer pico, pessoa acordada.", "Tô aqui. Isso passa. Não vou a lugar nenhum. Uma de cada vez. Sem aula."],
    ["nao_discute", "Onda e paranoia.", "Não fala que ninguém tá olhando. Não corrige o que ela vê. Sai do barulho. Luz baixa."],
    ["nao_desce", "Querer mais uma, ou beber pra pousar.", "Álcool, benzo ou outra dose pra descer é como as pessoas apagam. Dez minutos. Gelo. Uma pessoa."],
    ["pouso", "A tristeza depois do estimulante.", "O vazio é o pouso, não a vida inteira. Dorme. Come se o estômago aceitar. Não bebe em cima."],
    ["lado", "Não acorda e ainda respira.", "De lado. Não dá água. Não sacode. Não deixa só. 192."],
    ["naloxona", "Só se tiver na bolsa e puder ser opioide.", "Uma dose, avisa o 192, espera, fica até o fim. Não desfaz estimulante. No Brasil muitas vezes não tem."],
    ["direto", "Quando a pessoa fala em sumir.", "Pergunta direto se tá pensando em acabar. A pergunta não planta a ideia. Fica. 188."],
    ["truque", "Amigo, onda, acordada, sem dor no peito.", "Com calma: tem alguém do lado passando pior, eu vou ver e já volto. Se não couber, não usa."],
  ];

  function beat(id, k, t, go, risk) {
    return { id, k, t, go: go || [], risk: !!risk };
  }
  function go(label, to) {
    return [label, to];
  }

  const flows = {
    mapa: {
      title: "Mapa",
      lede: "Primeiro: é comigo ou eu tô com alguém. Corpo estranho liga. O resto é uma coisa só, dita devagar.",
      beats: [
        beat("home", "choice", "Quem tá no pico agora?", [
          go("Sou eu", "eu"),
          go("Tô com alguém", "amigo"),
        ]),
        beat("eu", "choice", "O que tá mais perto?", [
          go("Bateu forte", "torto"),
          go("Pânico", "panico"),
          go("Onde eu tô", "realidade"),
          go("Estão me olhando", "trava"),
          go("Sozinho ou caindo", "falar"),
          go("O corpo assusta", "samu"),
        ]),
        beat("rf", "choice", "Se alguma destas é agora, liga. Dor no peito que espalha. Convulsão. Não acorda. Respiração muito lenta ou lábio roxo. Muito calor e confusão. Um lado fraco.", [
          go("Sim ou não sei", "samu"),
          go("Não, nenhuma", "torto"),
        ], true),
      ],
    },
    torto: {
      title: "Bateu forte",
      lede: "Se o corpo assusta, liga. Se tá acordado: para, sai do barulho, gelo, uma frase. Não bebe pra descer. Não pega mais uma pra arrumar.",
      beats: [
        beat("a1", "choice", "Tô aqui. O que tá mais perto do agora?", [
          go("Acelerou, calor, coração", "red_flag"),
          go("Onda, tudo estranho", "red_flag"),
          go("Álcool, G ou derrubou", "no_mix"),
          go("Usei seringa", "red_flag"),
          go("Não usei nada", "panico"),
          go("Estão me olhando", "trava"),
        ]),
        beat("red_flag", "choice", "Alguma destas agora? Dor ou aperto no peito. Convulsão, desmaio, não acorda. Respiração muito lenta ou lábio roxo. Muito calor e confusão. Um lado fraco, boca torta, fala embolada.", [
          go("Sim ou não sei", "samu"),
          go("Não · estimulante", "cool"),
          go("Não · onda", "psych"),
          go("Não · seringa e estável", "inject"),
        ], true),
        beat("cool", "task", "Para. Sai da pista, do sol, do som alto. Pano frio na nuca. Se tá acordado, goles, não a garrafa. O resto fica longe. Não soma outra coisa pra descer.", [go("Parei", "one")]),
        beat("one", "task", "Uma coisa só: luz mais baixa, ou som mais baixo, ou outro canto. Não reforma o lugar.", [go("Uma coisa", "reality")]),
        beat("reality", "task", "Se der, fala alto: tô sob efeito. Isso desce. Som alto piora.", [go("Disse", "check")]),
        beat("psych", "info", "Não luta com o que tá vendo. O chão continua aí. Eu fico. Sem aula.", [go("Continuar", "one")]),
        beat("no_mix", "choice", "Álcool, G ou outro depressor. Você está acordado e conseguindo ler?", [
          go("Acordado", "alcool"),
          go("Apagando, vômito, respiração ruim", "recovery"),
        ], true),
        beat("alcool", "task", "Se o estômago aceita, um gole e alguma comida. Não dirige. Não toma comprimido pra apagar, não mistura G, não bebe mais pra dormir.", [go("Feito", "check")]),
        beat("recovery", "action", "De lado. Joelho de cima dobrado. Não dá água. Não deixa só. SAMU 192. Bombeiros 193.", [go("Continuar", "nalox")], true),
        beat("nalox", "info", "Se não acorda, a respiração tá ruim e pode ser opioide: quem tiver naloxona e souber usar, usa, liga o 192 e fica. Não desfaz cocaína, MDMA nem anfetamina.", [go("192", "samu")]),
        beat("inject", "info", "Se ainda tá estável e lendo: não divide seringa. Se a respiração já caiu, esquece isso e fica na ligação.", [go("Estável", "check")]),
        beat("check", "choice", "E agora, comparado com quando abriu?", [
          go("Um pouco melhor", "breath"),
          go("Quero mais uma", "urge"),
          go("Piorou no corpo", "samu"),
          go("Caiu uma tristeza enorme", "comedown"),
        ]),
        beat("urge", "task", "A vontade mente que mais uma resolve. Dez minutos. Gelo no punho. Fome, raiva ou cansaço? Uma coisa pequena. Não pega.", [go("Esperei", "breath")]),
        beat("breath", "task", "4 inspira, segura pouco, 6 solta. Para se der tontura.", [go("Respirei", "gente")]),
        beat("gente", "choice", "Tem alguém, ou prefere o 188?", [
          go("Tem alguém", "fecha"),
          go("188", "cvv"),
        ]),
        beat("cvv", "action", "CVV 188. Voz humana, 24 horas.", [go("Continuar", "fecha")]),
        beat("comedown", "info", "Esse vazio é o pouso, não o resto da sua vida. Dói de verdade. Não bebe em cima pra dormir. Se der, dorme. Se der, chama alguém.", [go("Ir para Solidão", "falar")]),
        beat("fecha", "end", "Você ficou. O próximo minuto basta. 188 continua aqui."),
      ],
    },
    panico: {
      title: "Pânico",
      lede: "O que as pessoas repetem quando passa: gelo no punho até doer, ou duas puxadas e uma solta longa. Uma frase. Sem fila de técnica.",
      beats: [
        beat("red", "choice", "Aperto no peito que espalha, desmaio, convulsão, falta de ar que não entra, um lado do corpo fraco? Se não souber, conta como sim.", [
          go("Sim ou não sei", "samu"),
          go("Não, nenhuma", "corpo"),
        ], true),
        beat("corpo", "choice", "Sem isso, o corpo tá gritando. Qual você consegue agora?", [
          go("Gelo no punho até doer", "gelo"),
          go("Duas puxadas, solta longo", "sigh"),
          go("Usei algo", "torto"),
        ]),
        beat("gelo", "task", "Gelo na mão fechada até começar a doer. Segura. A atenção sai do peito e vai pro frio.", [go("Doendo", "frame")]),
        beat("sigh", "task", "Duas puxadas pelo nariz. Solta tudo pela boca. De novo. Três ou quatro. Para se tontar.", [go("Soltei", "frame")]),
        beat("frame", "info", "Tô aqui. Isso passa. Você não precisa explicar.", [go("Continuar", "anchor")]),
        beat("anchor", "task", "Três coisas nesta sala. Os dois pés no chão. Só isso.", [go("Vi", "check")]),
        beat("check", "choice", "E agora?", [
          go("Baixou um pouco", "cvv"),
          go("Ainda alto", "ainda"),
        ]),
        beat("ainda", "choice", "Mais uma. Não as quatro.", [
          go("Respirar junto, contando", "box"),
          go("Som no peito, boca fechada", "hum"),
        ]),
        beat("hum", "task", "Boca fechada. Hmmm. Quinze segundos. Sente o peito vibrar.", [go("Vibrou", "cvv")]),
        beat("box", "task", "Quatro tempos pra entrar, quatro parado, quatro pra sair, quatro parado. Quatro voltas. Se alguém estiver aí, faz junto.", [go("Fiz", "cvv")]),
        beat("cvv", "action", "Se quiser uma voz agora: CVV 188.", [go("Continuar", "fecha")]),
        beat("fecha", "end", "Não é frescura. Passa. Pode parar aqui. 188 fica."),
      ],
    },
    realidade: {
      title: "Onde eu tô",
      lede: "Sem diagnóstico na entrada. Toque, nomear, frio na mão, uma respiração. O nome clínico, se existir, fica no fim e é opcional.",
      beats: [
        beat("a1", "choice", "Parece filme, ou você parece longe de você. O que está mais forte?", [
          go("Tudo longe ou eu longe", "plain"),
          go("Usei algo", "torto"),
          go("Coração disparado junto", "panico"),
        ]),
        beat("plain", "info", "É o nervo se protegendo. Incômodo, e em geral passa. Você está aqui. O chão está aqui.", [go("Continuar", "toque")]),
        beat("toque", "task", "Toca o tecido da roupa. Palma na parede ou no chão.", [go("Senti", "nomeia")]),
        beat("nomeia", "task", "Diz três objetos que existem neste cômodo.", [go("Nomeei", "frio")]),
        beat("frio", "task", "Gelo ou água fria na mão.", [go("Frio", "breath")]),
        beat("breath", "task", "4, segura pouco, 6. Uma série só.", [go("Respirei", "check")]),
        beat("check", "choice", "O estranho diminuiu um pouco?", [
          go("Um pouco", "move"),
          go("Ainda forte", "move"),
        ]),
        beat("move", "task", "Aperta e solta os punhos, devagar. Mexe os dedos dos pés.", [go("Me movi", "gente")]),
        beat("gente", "choice", "Alguém pode ficar perto, mesmo em silêncio?", [
          go("Posso chamar", "fecha"),
          go("Não agora", "cvv"),
        ]),
        beat("cvv", "action", "CVV 188.", [go("Continuar", "fecha")]),
        beat("fecha", "end", "Você ficou, mesmo com tudo estranho. Pode ir devagar. 188 aqui."),
      ],
    },
    trava: {
      title: "Paranoia",
      lede: "A sensação é real. Não se discute. Baixa uma coisa do ambiente. SMS só depois de dez segundos.",
      beats: [
        beat("a1", "choice", "Tô aqui. O que trava mais agora?", [
          go("Estão me olhando ou julgando", "frame"),
          go("Travei, não mexo", "frame"),
          go("Falta de ar junto", "panico"),
          go("Tudo irreal junto", "realidade"),
          go("Pensamento de acabar", "cssrs"),
        ]),
        beat("frame", "info", "A sensação está real. Discutir com ela não ajuda. Vamos baixar uma coisa só.", [go("Continuar", "uma")]),
        beat("uma", "task", "Capuz, olhar no chão, ou som mais baixo. Uma. Costa numa parede, se der.", [go("Baixei uma", "script")]),
        beat("script", "task", "Em voz alta: eu estou aqui. O excesso de som ou luz piora. Isto passa.", [go("Disse", "corpo")]),
        beat("corpo", "choice", "O corpo deixa fazer algo pequeno?", [
          go("Quase nada", "pes"),
          go("Consigo os braços", "hug"),
        ]),
        beat("pes", "task", "Dedos dos pés, um lado e outro.", [go("Mexi", "check")]),
        beat("hug", "task", "Braços cruzados, toque alternado nos ombros, devagar. Só se tocar em você for ok.", [go("Toquei", "check")]),
        beat("check", "choice", "A agitação cedeu um pouco?", [
          go("Um pouco", "gente"),
          go("Ainda alto", "cvv"),
        ]),
        beat("gente", "choice", "Tem alguém para um SMS curto?", [
          go("Sim", "crt"),
          go("Não", "cvv"),
        ]),
        beat("crt", "task", "Dez segundos antes de enviar.", [go("Pausei", "sms")]),
        beat("sms", "action", "Mensagem pronta: tô mal, pode ficar na linha?", [go("Continuar", "fecha")]),
        beat("cvv", "action", "CVV 188. Não é tarefa riscada. É ligação.", [go("Continuar", "fecha")]),
        beat("fecha", "end", "Você não saiu. O corpo sai da trava no tempo dele. 188 aqui."),
      ],
    },
    falar: {
      title: "Solidão, depressão, pico",
      lede: "Três portas num fluxo só. Pensamento de acabar não passa por diário. CVV não é checkbox.",
      beats: [
        beat("a1", "choice", "Tô aqui. O que pesa mais neste minuto?", [
          go("Muito só ou vazio", "so"),
          go("Pico: choro, raiva, vergonha", "pico"),
          go("Pensamento de acabar ou de me machucar", "cssrs"),
          go("Usei algo", "torto"),
          go("Não sei se o corpo está seguro", "samu"),
        ]),
        beat("so", "info", "A dor é real. Não é drama. E não é o resto da vida inteira, mesmo o cérebro jurando que é.", [go("Continuar", "halt")]),
        beat("halt", "task", "Antes de decidir qualquer coisa grande: fome, raiva ou cansaço? Uma coisa pequena. Água, comida, banho.", [go("Uma coisa", "gente")]),
        beat("pico", "choice", "Uma coisa para o corpo.", [
          go("Gelo", "gelo"),
          go("Punho", "punho"),
        ]),
        beat("gelo", "task", "Gelo na mão, 15 segundos.", [go("Frio", "crt")]),
        beat("punho", "task", "Aperta o punho 5 segundos e solta. Três vezes.", [go("Soltei", "crt")]),
        beat("crt", "task", "Não manda a mensagem ainda. Dez segundos.", [go("Pausei", "palavra")]),
        beat("palavra", "choice", "Qual a palavra desse pico? Uma.", [
          go("Qualquer palavra", "gente"),
        ]),
        beat("gente", "choice", "Alguém na linha, ou 188?", [
          go("Tem alguém", "wa"),
          go("Ninguém", "cvv"),
        ]),
        beat("wa", "action", "Texto pronto, você aperta enviar: ei, tô passando mal. Pode ficar na linha?", [go("Continuar", "plano")]),
        beat("cvv", "action", "CVV 188. Voz humana, 24 horas.", [go("Continuar", "plano")]),
        beat("plano", "task", "Uma coisa só para a próxima hora. Água, cortina, banho, cama.", [go("Tenho uma", "fecha")]),
        beat("fecha", "end", "Você não está só. Não precisa estar bem. Pode parar aqui."),
      ],
    },
    samu: {
      title: "Resgate",
      lede: "Liga primeiro. Frase curta. Não entra em pânico junto. Não promete o que a viatura faz.",
      beats: [
        beat("liga", "action", "Liga agora. Fala: socorro médico, o que você vê, o lugar, fica na linha. Embalagem se tiver. Não precisa narrar crime. SAMU 192. Bombeiros 193.", [go("Liguei", "vendo")], true),
        beat("vendo", "choice", "Enquanto eles vêm, ou ainda na linha. O que você vê?", [
          go("Não acorda ou respiração ruim", "lado"),
          go("Muito quente, agitado ou dor no peito", "calor"),
          go("Convulsionando", "conv"),
          go("Caiu", "queda"),
          go("Boca torta ou um lado fraco", "avc"),
          go("Acordado, pânico ou medo", "luz"),
        ]),
        beat("lado", "action", "De lado. Joelho de cima dobrado. Não dá água. Não sacode. Não deixa só. Se puder ser opioide e tiver naloxona: uma dose, avisa o SAMU, espera 2–3 minutos.", [go("De lado", "prep")], true),
        beat("calor", "info", "Para de se mexer. Pano frio na nuca, axila, atrás do joelho. Não segura à força. Não discute o que a pessoa está vendo. Dor no peito: diz isso para o SAMU.", [go("Continuar", "prep")]),
        beat("conv", "info", "Nada na boca. Não segura o corpo. Afasta o que machuca. Quando passar, de lado. Continua na linha.", [go("Continuar", "prep")]),
        beat("queda", "info", "Não move. Se suspeitar de coluna, as mãos só impedem a cabeça de girar. O SAMU guia.", [go("Continuar", "prep")]),
        beat("avc", "info", "Boca torta, um braço fraco, fala embolada: diz essas três coisas para o atendente. Agora.", [go("Avisar", "prep")]),
        beat("luz", "choice", "Acordada e com medo. Uma frase de cada vez: tô aqui. Isso passa. Não vou a lugar nenhum. Não toca sem pedir. Não discute o que ela vê.", [
          go("Fico quieto do lado", "prep"),
          go("Pergunto o que ela precisa", "pergunta"),
          go("É onda, sem dor no peito", "truque"),
        ]),
        beat("pergunta", "choice", "Não chuta. Pergunta.", [
          go("Gelo no punho", "prep"),
          go("Respirar junto", "prep"),
          go("Sair do barulho", "prep"),
          go("Ficar quieto", "prep"),
        ]),
        beat("truque", "info", "Só se estiver acordada, em onda, sem dor no peito. Devagar: tem alguém do lado passando pior. Eu vou ver e já volto. Se a frase não couber, não usa.", [go("Voltei", "prep")]),
        beat("prep", "task", "Lugar claro para a equipe. Nome e idade, e o que pode ter usado, se souber. Alguém na porta.", [go("Pronto", "cuida")]),
        beat("cuida", "info", "Você também passou por isso. Três respirações lentas. 188 é seu também, depois.", [go("Continuar", "depois")]),
        beat("depois", "action", "CVV 188 para quem cuidou. CAPS é acolhimento do SUS, não hospital. Sem lista inventada.", [go("Continuar", "fecha")]),
        beat("fecha", "end", "Você ficou com a pessoa. Isso importa. Cuida de você também."),
      ],
    },
    cssrs: {
      title: "Pergunta direta",
      lede: "Pergunta sem rodeio e sem lista de jeito. Se a ideia for não, ainda pergunta se fez alguma coisa. A pergunta não planta nada.",
      beats: [
        beat("c1", "choice", "Nos últimos 30 dias, você desejou estar morto ou dormir e não acordar?", [
          go("Sim", "pausa"),
          go("Não", "c2"),
        ], true),
        beat("pausa", "task", "Três vezes: entra devagar, solta mais devagar. Só três.", [go("Três", "c2")]),
        beat("c2", "choice", "Você teve pensamentos de acabar com a própria vida?", [
          go("Sim", "c3"),
          go("Não", "c6"),
        ], true),
        beat("c3", "choice", "Você pensou em como seria?", [
          go("Sim", "gelo"),
          go("Não", "c4"),
        ]),
        beat("gelo", "task", "Água fria ou gelo na mão, 15 segundos.", [go("Feito", "c4")]),
        beat("c4", "choice", "Teve esses pensamentos e alguma intenção de agir?", [
          go("Sim", "box"),
          go("Não", "c5"),
        ], true),
        beat("box", "task", "Box 4 por 4, quatro ciclos.", [go("Respirei", "c5")]),
        beat("c5", "choice", "Você começou a organizar um plano? Se sim, não conta o plano. A gente só afasta.", [
          go("Sim", "meios"),
          go("Não", "c6"),
        ], true),
        beat("c6", "choice", "Nos últimos 3 meses, você fez, começou ou preparou alguma coisa para acabar com a própria vida?", [
          go("Sim, nestes 3 meses", "emerg"),
          go("Sim, mas faz mais tempo", "passado"),
          go("Não", "coping"),
        ], true),
        beat("emerg", "action", "Isso pede gente agora. Pode ligar junto com alguém. CVV 188. SAMU 192.", [go("Continuar", "meios")], true),
        beat("passado", "action", "Faz tempo, e ainda importa. Uma voz agora: CVV 188.", [go("Continuar", "safety")]),
        beat("meios", "task", "Mais longe, por agora. Não precisa jogar fora. Remédio noutro cômodo ou com alguém. Objeto que corta, ou arma, com outra pessoa. Sai de janela e varanda. Senta no chão.", [go("Mais longe", "safety")], true),
        beat("coping", "choice", "Continuo aqui. O que ajuda mais neste minuto?", [
          go("Um plano curto", "safety"),
          go("Uma foto ou razão", "hope"),
          go("O que disparou", "gatilho"),
        ]),
        beat("safety", "task", "Quatro linhas: um sinal de que o pico voltou. Uma coisa que você faz sem ninguém. Uma pessoa. 188 e 192 já estão nesta tela.", [go("Anotei", "gatilho")]),
        beat("hope", "task", "Uma foto que acalma, ou uma razão pequena para as próximas horas, ou uma mensagem antiga boa.", [go("Olhei", "gatilho")]),
        beat("gatilho", "choice", "Uma palavra, se quiser. O que disparou?", [
          go("Substância ou álcool", "torto"),
          go("Outra coisa ou não sei", "falar"),
        ]),
      ],
    },
    amigo: {
      title: "Tô com alguém",
      lede: "Quem já segurou amigo de verdade repete isso: frase curta, não discute, não entra em pânico junto, pergunta em vez de adivinhar.",
      beats: [
        beat("a1", "choice", "A pessoa tá como agora?", [
          go("Não acorda ou respira mal", "samu"),
          go("Peito, calor, convulsão, um lado fraco", "samu"),
          go("Acordada, pânico ou onda", "fala"),
          go("Com medo de estar sendo olhada", "medo"),
          go("Falou em acabar", "direto"),
        ], true),
        beat("fala", "task", "Uma frase. Para. Outra. Tô aqui. Isso passa. Não vou a lugar nenhum. Não explica o cérebro.", [go("Falei", "pergunta")]),
        beat("pergunta", "choice", "Agora pergunta. Não chuta.", [
          go("Gelo no punho até doer", "gelo"),
          go("Respirar no mesmo tempo", "junto"),
          go("Sair do barulho", "sai"),
          go("Ficar quieto do lado", "quieto"),
        ]),
        beat("gelo", "task", "Gelo na mão dela, se ela topar. Até doer um pouco. Você fica.", [go("Segurou", "nao")]),
        beat("junto", "task", "Você respira devagar na frente dela. Conta. Ela copia se quiser. Você não acelera junto.", [go("Respirei", "nao")]),
        beat("sai", "task", "Tira do meio da roda, do sol, do som. Um canto. Sem surpresa no caminho.", [go("Saí", "nao")]),
        beat("quieto", "info", "Senta. Fica previsível. Não some pra buscar ninguém sem avisar.", [go("Fiquei", "nao")]),
        beat("medo", "info", "Não fala que ninguém tá olhando. Luz baixa. Capuz se ela quiser. Frase curta. Sem plateia.", [go("Baixei", "pergunta")]),
        beat("direto", "choice", "Pergunta direto: você tá pensando em acabar com a sua vida? A pergunta não planta a ideia.", [
          go("Sim ou não sei", "cssrs"),
          go("Não, e o corpo assusta", "samu"),
          go("Não", "fala"),
        ], true),
        beat("nao", "info", "Não oferece comprimido. Não bebe junto pra descer. Não discute o que ela vê. Não segura à força.", [go("Entendi", "truque")]),
        beat("truque", "choice", "Só se for onda, acordada, sem dor no peito.", [
          go("Cabe a frase", "frase"),
          go("Não cabe", "fecha"),
        ]),
        beat("frase", "info", "Devagar, com bondade: tem alguém do lado passando pior. Eu vou ver e já volto. E volta.", [go("Voltei", "fecha")]),
        beat("fecha", "end", "Você ficou. Quando passar, o 188 também é seu."),
      ],
    },
  };

  const pages = {
    tese: `
      <h2>Como fala</h2>
      <p class="lede">Quem tá no pico não lê manual. Lê uma frase de alguém que já ficou.</p>
      <p>O app fala como a pessoa do lado: curto, concreto, sem aula de cérebro. Se o corpo assusta, a primeira frase é ligar. O resto é gelo, uma respiração, uma pessoa.</p>
      <p class="note">Não é atendimento. Não substitui o 188 nem o 192.</p>
      <div class="files">
        <span>index.html</span>
        <span>style.css</span>
        <span>app.js</span>
        <a href="../sos-002-harm-control.zip">Baixar o zip</a>
      </div>
    `,
    rua: `
      <h2>Do X, na prática</h2>
      <p class="lede">Não é estudo. É o que as pessoas escrevem quando já passaram e voltaram pra contar.</p>
      <h3>O que se repete</h3>
      <ul>
        <li><strong>Gelo no punho até doer.</strong> Puxa o pânico do peito pra mão. É o conselho que mais aparece de quem diz que funcionou.</li>
        <li><strong>Água fria no rosto</strong> e <strong>duas puxadas, uma solta longa</strong>, três ou quatro vezes. Menos de um minuto.</li>
        <li><strong>Frase curta.</strong> Tô aqui. Isso passa. Não vou a lugar nenhum. Sem texto longo. Sem surpresa.</li>
        <li><strong>Respira junto.</strong> Quem tá do lado não acelera junto. Conta devagar.</li>
        <li><strong>Pergunta.</strong> Não chuta o que a pessoa precisa. E pergunta direto se ela tá pensando em acabar. A pergunta não planta a ideia.</li>
        <li><strong>Não discute</strong> o que ela tá vendo. Sai do barulho. Luz baixa.</li>
        <li><strong>O pouso mente.</strong> O vazio depois do estimulante parece a vida inteira. É o pouso. Dorme. Não bebe em cima.</li>
        <li><strong>Não acorda:</strong> de lado, sem água, sem sacudir, fica, liga. Naloxona só se tiver na bolsa e puder ser opioide.</li>
      </ul>
      <h3>O que aparece e a gente joga fora</h3>
      <ul>
        <li>Beber pra descer. Tem gente que conta o apagão como se fosse jeito. Não é.</li>
        <li>Comprimido emprestado no meio do pânico.</li>
        <li>Mais uma dose pra arrumar a primeira.</li>
        <li>“Você tá seguro” antes de olhar peito, calor, convulsão, respiração.</li>
        <li>“Ninguém tá te olhando.” A pessoa não acredita, e a discussão piora.</li>
        <li>Truque de festival usado em quem não acorda, ou com dor no peito. A frase “tem alguém pior do lado, eu já volto” só cabe em onda, acordada, com bondade, e a pessoa volta.</li>
      </ul>
    `,
    campo: `
      <h2>O que a gente usa</h2>
      <p>Mistura o que funciona na hora com o que machuca. Fica só o primeiro.</p>
      <h3>Fica</h3>
      <ul>
        <li><strong>Gelo na mão</strong> até doer, e o suspiro duplo, no primeiro minuto. Hoje estão no fim de uma fila de técnicas.</li>
        <li><strong>Dizer o óbvio em voz alta.</strong> Estou sob efeito. O som alto piora. Isto passa. Não “ninguém está te olhando”.</li>
        <li><strong>Frase curta.</strong> Dois botões, não pergunta aberta. Sentar sem guiar. Atravessar sem baixar a pessoa na marra.</li>
        <li><strong>A queda depois do estimulante</strong> mente que a vida inteira é aquilo. O peso é real. O para sempre não é.</li>
        <li><strong>Posição de lado, ficar, não dar água</strong> se a pessoa não acorda. Naloxona só se existir e alguém souber usar.</li>
      </ul>
      <h3>Não entra</h3>
      <ul>
        <li>Benzo, álcool ou mais uma dose para “descer” ou “limpar”.</li>
        <li>Spray, suplemento ou truque viral sem protocolo.</li>
        <li>Tutorial de quanto usar, via ou tempo de redose.</li>
        <li>Lista de métodos na pergunta da triagem. A pergunta fica. Os exemplos não.</li>
        <li>“Você não está morrendo” antes de perguntar dor no peito, calor, convulsão, respiração.</li>
        <li>A garantia de que o resgate não chama a polícia.</li>
      </ul>
    `,
    furos: `
      <h2>O que muda de verdade</h2>
      <table>
        <thead><tr><th></th><th>Hoje</th><th>Ajuste</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Acalmar antes de checar o corpo</td><td>Um portão, dois botões, dúvida liga</td></tr>
          <tr><td>2</td><td>Bateu forte sem 192 cedo</td><td>Barra 188/192 o tempo todo. Atalho começa no portão</td></tr>
          <tr><td>3</td><td>250 ml por dose, água à vontade</td><td>Corta o número. Acordado: goles. Apagando: nada pela boca</td></tr>
          <tr><td>4</td><td>Calor só como ventilador</td><td>Parar, pano frio, sombra. Confuso e muito quente é 192. Não há antídoto de estimulante</td></tr>
          <tr><td>5</td><td>Injeção sem falar de respiração lenta</td><td>Respiração ruim primeiro. Aula de seringa só se estável. Naloxona se houver e se opioide for possível</td></tr>
          <tr><td>6</td><td>G ausente</td><td>G com álcool apaga fácil. Lado, nada pela boca, 192. Sem mililitro</td></tr>
          <tr><td>7</td><td>Triagem pula o ato se a ideia for não. Texto diz “se machucar”</td><td>O ato é perguntado mesmo assim. Texto: acabar com a própria vida. Sem exemplos</td></tr>
          <tr><td>8</td><td>Plano de segurança só afasta meios</td><td>Quatro linhas depois: sinal, o que eu faço só, uma pessoa, 188/192</td></tr>
          <tr><td>9</td><td>Nove técnicas seguidas, respiração tarde, caminhada no pico</td><td>Portão, um corpo, uma âncora, check, humano, pode parar</td></tr>
          <tr><td>10</td><td>Várias morais no fim. Dois nós iguais em Paranoia</td><td>Uma frase. O resto é “fica mais”</td></tr>
          <tr><td>11</td><td>Obrigado, sozinho, nome de diagnóstico na cara</td><td>Valeu por contar. Você não está só. Experiência primeiro</td></tr>
          <tr><td>12</td><td>CVV como caixinha</td><td>Hotline é botão, nunca checklist</td></tr>
        </tbody>
      </table>
      <h3>O que dizer no 192</h3>
      <p>Preciso de socorro médico agora. A pessoa não acorda, ou respira devagar, ou está muito quente e confusa, ou tem dor no peito, ou está em convulsão. Estamos neste lugar. Vou ficar na linha.</p>
      <p class="note">Não precisa narrar crime, quantidade nem o que era. Se tiver embalagem, guarda para a equipe. Não prometemos o que a viatura faz.</p>
    `,
    regras: `
      <h2>Regras do fluxo</h2>
      <ol>
        <li>Ligar é o primeiro pixel quando o caso é corpo. Texto depois da ligação.</li>
        <li>Uma bandeira vermelha, dois botões, em Bateu forte, Pânico e em todo preciso de algo agora.</li>
        <li>No pico, no máximo seis telas até poder fechar.</li>
        <li>Uma técnica por tela. Se não mexeu, a pessoa escolhe a próxima.</li>
        <li>Não discutir a realidade dela. Baixar uma coisa do ambiente.</li>
        <li>Não oferecer substância para consertar substância.</li>
        <li>Frase de farol: estou aqui. Isto sobe e desce. O próximo minuto basta.</li>
        <li>Toque só com permissão. Vale para o amigo no resgate também.</li>
        <li>188 no meio, não só no slide de tchau.</li>
        <li>Número, endereço e promessa legal ficam escondidos até alguém verificar no chão.</li>
      </ol>
      <h3>Voz</h3>
      <p>Você, nunca tu. Sem Obrigado. Sem sempre, de verdade, na hora, não está morrendo. Rótulos iguais aos da home: Bateu forte, Pânico, Onde eu tô, Paranoia, Solidão, Resgate. Travei, Onde estou e Tô sozinho saem dos botões. No pico, cerca de 25 palavras.</p>
      <h3>Imagem, se um dia existir</h3>
      <ul>
        <li>Três quadros da posição de lado.</li>
        <li>Onde por o pano frio: nuca, axila, atrás do joelho.</li>
        <li>Quinze segundos sem fala do suspiro duplo.</li>
        <li>O orb que já existe para o 4-6.</li>
      </ul>
      <p class="note">Sem autoplay com som. Sem imagem de uso. Sem imagem de método.</p>
    `,
    ferramentas: `<h2>O que fazer com a mão</h2><p>Uma coisa por vez. Se não mexeu, escolhe a próxima. Não empilha.</p><div class="tools" id="tools"></div>`,
    ordem: `
      <h2>Ordem, só de conteúdo</h2>
      <ol>
        <li>Criar o portão e colocar na frente de Bateu forte, Pânico e dos atalhos. Enquanto não existe, apagar as frases absolutas de segurança.</li>
        <li>Corrigir a triagem: não na ideia ainda pergunta o ato. Acabar com a própria vida. Três ciclos querem dizer três. Sem lista de métodos.</li>
        <li>Trocar a frase da polícia. Trocar 250 ml por dose. Trocar água ilimitada pelo cartão de esfriar.</li>
        <li>Barra 188/192 dentro de Bateu forte.</li>
        <li>Ligar ou apagar órfãos. Cortar o nó duplicado. CVV deixa de ser checkbox.</li>
        <li>Encurtar cada caminho até poder parar. A cauda motivacional vira um nó.</li>
        <li>Entrar queda química, onda da fissura, não misturar, naloxona se houver, microplano, script de realidade.</li>
        <li>Lista de CAPS continua escondida. CAPS não é hospital.</li>
        <li>Alguém da clínica assina portão, naloxona no Brasil, G, calor, triagem e a frase do SAMU.</li>
      </ol>
      <p>Nada disso depende de redesign. É frase e caminho.</p>
    `,
    patch: `
      <h2>Patch de nós</h2>
      <p>O que não está aqui fica, até a poda da cauda. Revisão clínica antes de publicar.</p>
      <h3>Bateu forte</h3>
      <ul>
        <li><strong>a3_stim</strong> deixa de ser órfão e entra no esfriar, depois do portão. Cortar “não está colapsando” e “baixa de verdade”.</li>
        <li><strong>fast_stim</strong> vira parar, pano frio, goles, afastar, não somar. Dor no peito abre o 192, não uma caixinha.</li>
        <li><strong>m3</strong> sai do caminho principal. Segunda água fria seguida é repetição.</li>
        <li><strong>m9 e álcool</strong> perdem o 250 ml. Apagando: de lado, sem água, 192.</li>
        <li><strong>m12 a m15</strong> viram um fecho.</li>
      </ul>
      <h3>Pânico</h3>
      <ul>
        <li><strong>a3_severe e m1</strong> perdem “não está morrendo” e “não está em perigo real”. A frase que fica é condicional, depois do portão: costuma ser alarme falso. Não é garantia.</li>
        <li>A fila breath, suspiro, mindfulness, humming, rabisco, água de novo e box deixa de ser obrigatória.</li>
      </ul>
      <h3>Onde eu tô, Paranoia, Solidão</h3>
      <ul>
        <li><strong>realidade.a2</strong> descreve a experiência. O nome clínico sai da entrada. O redirect para Pânico, hoje órfão, ganha um botão.</li>
        <li><strong>trava.a3_paranoia</strong> para de afirmar que ninguém olha. m11 e m14 são o mesmo texto: fica um.</li>
        <li><strong>falar</strong> separa só, pico e pensamento de acabar. Caminhada sai do pico. CVV sai do checklist. Obrigado sai.</li>
      </ul>
      <h3>Resgate e triagem</h3>
      <ul>
        <li><strong>instant_rescue</strong> troca a frase da polícia pelo roteiro da ligação. A triagem do que se vê volta depois do telefonema, não antes.</li>
        <li><strong>m10</strong>, hoje morto, entra no cuidado de quem ficou com a pessoa.</li>
        <li><strong>c2 = não</strong> vai para c6, não para o menu de coping. c6 deixa de dizer “se machucar”. Plano sim vai para meios na hora, sem pedir o plano.</li>
      </ul>
      <h3>Não mexer</h3>
      <p>torto.m1, torto.a2_unclear, falar.m2, falar.m9, panico.m10 depois do portão, trava.a3_freeze, realidade.a3_anchor, samu.m11. Posição de lado, não mover quem caiu, pausa antes do SMS, uma pergunta da triagem por vez.</p>
    `,
  };

  const main = document.getElementById("conteudo");
  const navEl = document.getElementById("nav");

  nav.forEach(function (item) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = item[1];
    b.dataset.id = item[0];
    b.addEventListener("click", function () {
      show(item[0]);
    });
    navEl.appendChild(b);
  });

  function esc(s) {
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">");
  }

  function show(id) {
    Array.prototype.forEach.call(navEl.children, function (btn) {
      btn.setAttribute("aria-current", btn.dataset.id === id ? "true" : "false");
    });
    if (pages[id]) {
      main.innerHTML = pages[id];
      if (id === "ferramentas") paintTools();
    } else if (flows[id]) {
      paintFlow(id);
    }
    main.focus();
    window.scrollTo(0, 0);
  }

  function paintTools() {
    const box = document.getElementById("tools");
    tools.forEach(function (row) {
      const el = document.createElement("article");
      el.className = "tool";
      el.innerHTML = "<b>" + esc(row[0]) + "</b><span>" + esc(row[1]) + "</span><p>" + esc(row[2]) + "</p>";
      box.appendChild(el);
    });
  }

  function paintFlow(id) {
    const flow = flows[id];
    main.innerHTML = "";
    const head = document.createElement("div");
    head.className = "flow-head";
    head.innerHTML = "<h2>" + esc(flow.title) + "</h2><p class=\"lede\">" + esc(flow.lede) + "</p>";
    main.appendChild(head);
    flow.beats.forEach(function (node) {
      const card = document.createElement("article");
      card.className = "beat" + (node.risk ? " risk" : "");
      card.id = "n-" + node.id;
      const outs = document.createElement("div");
      outs.className = "outs";
      (node.go || []).forEach(function (edge) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.innerHTML = esc(edge[0]) + " <span class=\"arrow\">→</span>";
        btn.addEventListener("click", function () {
          const target = edge[1];
          if (flows[target]) {
            show(target);
            return;
          }
          const local = document.getElementById("n-" + target);
          if (local) local.scrollIntoView({ block: "start" });
        });
        outs.appendChild(btn);
      });
      card.innerHTML = "<div class=\"kind\">" + esc(KIND[node.k] || node.k) + " · " + esc(node.id) + "</div><p>" + esc(node.t) + "</p>";
      card.appendChild(outs);
      main.appendChild(card);
    });
  }

  show("tese");
})();
