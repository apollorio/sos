# SOS Apollo — Modo Médico refinado para hospital e PDF

## Resultado entregue

Preparei uma nova versão **autônoma, sem servidor e sem dependências externas**, redesenhada especificamente para dois usos simultâneos: leitura muito rápida na tela por um profissional de urgência e **impressão/“Salvar como PDF” em A4** sem destruir a hierarquia das informações.

[**Baixar o HTML refinado — SOS Apollo Modo Médico**](sandbox:/mnt/data/sos-apollo-modo-medico-print-refined.html)

A principal mudança conceitual foi abandonar o aspecto de “dashboard bonito com dados clínicos simulados” e transformar a página em um **handoff estruturado de informações realmente existentes no motor**. Isso é mais coerente com boas práticas de passagem de caso: um handoff deve transmitir a situação, o grau de incerteza, mudanças recentes e resposta às intervenções, e não apenas apresentar um diagnóstico presumido. citeturn2search13turn2search17

A versão anterior inventava, para fins visuais, nome, idade, peso, frequência cardíaca, pressão, SpO₂, temperatura e outros dados que **não existem nos cenários reais do simulador**. A versão nova deliberadamente faz o contrário: quando o app não sabe, imprime **“NÃO INFORMADO”**. Essa distinção entre “não avaliado” e “ausente” é especialmente importante em um documento usado na transição de cuidado.

O documento também aproveita a arquitetura que já vinha sendo desenvolvida no material de pesquisa: segurança antes da classificação, separação entre dados relatados e inferências do motor e cuidado especial para não transformar uma classificação interna do aplicativo em diagnóstico clínico. fileciteturn0file0 A versão anterior do brainstorm também já tratava a barreira de emergência como superior ao “jogo” de classificação. fileciteturn0file1 fileciteturn0file2

## O que a pesquisa mudou no desenho

A estrutura final ficou mais próxima de um **resumo de transferência** do que de um “prontuário”. AHRQ descreve handoff como uma transferência padronizada de informação que deve incluir incerteza, resposta ao que já foi feito, mudanças recentes e contingências; o próprio framework SBAR parte de situação, contexto, avaliação e recomendação. citeturn2search13turn2search15

Por isso, no topo da página agora aparecem somente as informações que podem mudar a leitura imediata do episódio:

**Situação atual → sinais críticos disponíveis → contexto → exposição relatada → medidas já realizadas → lacunas de informação.**

A cronologia completa foi empurrada para a segunda página. Essa é uma decisão importante: o médico que recebe o celular não precisa primeiro atravessar dezenas de eventos do motor como `P2-035`, `VOI_DECISIVE`, `runtime:TICK` ou `KEEP_HELP`. Esses identificadores são ótimos para engenharia e auditoria, mas têm baixo valor na primeira leitura clínica. O relatório profissional mostra a consequência humana desses eventos, enquanto preserva o significado temporal.

A lógica também conversa melhor com o padrão **SAMPLA** encontrado em materiais oficiais do Ministério da Saúde, que inclui sinais/sintomas, alergias, medicamentos, passado médico, líquidos/alimentos e ambiente. citeturn0search17 No SOS Apollo, vários desses campos ainda não existem; portanto eles aparecem como lacunas explícitas em vez de serem preenchidos artificialmente.

Também alterei o título principal para:

> **Resumo de crise para profissional de saúde**

em vez de fazer a interface afirmar que o documento já é um “Prontuário de Emergência Psiquiátrica”. O Ministério da Saúde descreve o prontuário eletrônico como instrumento que registra e compartilha dados clínicos dentro do processo assistencial; no caso do Apollo, estamos lidando majoritariamente com autorrelato e eventos de aplicativo ainda não validados pela equipe médica. citeturn0search15

### Separação entre três níveis de informação

A nova versão trata cada item como pertencente implicitamente a uma destas categorias:

| Categoria | Como aparece |
|---|---|
| Informação que a pessoa informou | **RELATADO** |
| Interpretação/regra do motor | **DERIVADO PELO APP** |
| Dado que não existe | **NÃO INFORMADO** |

Isso evita um problema grave da versão anterior: um médico poderia interpretar visualmente um campo verde como “normal clinicamente”, quando na verdade o app só sabia que a pessoa tocou em uma resposta alguns minutos antes.

Exemplo:

> **Respiração: normal**  
> *Relato explícito; reavaliar na admissão.*

e não:

> ✅ Respiração normal

como se tivesse ocorrido ausculta, contagem respiratória ou monitorização.

O mesmo vale para o cenário `slow-pace-asks-less`: “relatou não ter usado nada” permanece **autorrelato**, não se transforma em “sem intoxicação”.

## Como os dois cenários simulados foram convertidos

O HTML possui um seletor de simulação somente na tela. O PDF contém apenas o episódio selecionado.

### Simulação de mistura relatada

No cenário `pista-bala-alcool-azulzinho`, a primeira página passa a mostrar:

> **Ansiedade muito alta; pessoa responsiva; mistura relatada durante o acompanhamento.**

Em seguida apresenta, como informações independentes:

- responsividade relatada como normal;
- respiração relatada como normal;
- sem dor/aperto no peito relatado;
- ansiedade `4/4` na escala interna;
- companhia presente;
- ambiente calmo;
- classe inicialmente relatada como “estimulante”;
- termo posteriormente relatado como **“bala / MD”**;
- álcool junto: **sim**;
- “azulzinho” / `pill`;
- desconforto: **nariz ardendo**.

Eu deliberadamente **não converti “azulzinho” em sildenafil** e não converti “bala / MD” em composição química confirmada. Isso seria uma inferência não sustentada pelo dado original.

O bloco de exposição, portanto, fica conceitualmente assim:

| Item | Relato | O que permanece desconhecido |
|---|---|---|
| Classe | “estimulante” | composição |
| Termo usado | “bala / MD” | composição, dose, via |
| Álcool | sim | quantidade e horário |
| Desempenho sexual | “azulzinho” / pill | princípio ativo, dose, horário |
| Sintoma local | nariz ardendo | não permite inferir via |

Essa última linha é particularmente importante: **nariz ardendo não autoriza o relatório a inventar via de administração**.

A segunda página preserva a sequência temporal útil:

> t+03:23 — relato de estimulante  
> t+04:27 — “bala / MD” + álcool  
> t+04:58 — aviso da combinação apresentado  
> t+05:01 — “azulzinho”  
> t+05:32 — segundo aviso apresentado  
> t+05:35 — nariz ardendo  
> t+06:36 — cuidado correspondente concluído

Assim, o médico consegue reconstruir rapidamente **quando o app soube de cada coisa**, sem ler o audit log de engenharia.

### Simulação sem uso relatado

Para `slow-pace-asks-less`, a página fica fundamentalmente diferente:

> **Ansiedade muito alta; pessoa responsiva; sem uso de substância relatado neste episódio.**

O HTML usa os horários absolutos que efetivamente estavam disponíveis:

> 09:14 — respiração normal relatada  
> 09:14 — sem dor/aperto no peito  
> 09:16 — respondia normalmente  
> 09:18 — ansiedade muito alta  
> 09:27 — com alguém  
> 09:28 — lugar calmo  
> 09:29 — relatou não ter usado nada

A sequência das medidas de apoio também aparece em ordem temporal, por exemplo água gelada no rosto, local firme, pés no chão, goles de água, suspiro duplo, ar fresco, vibração, alimento pequeno, parede, escovação, cinco sentidos, banho fresco e música.

Isso está alinhado à ideia de handoff de registrar **o que já foi tentado e a resposta/resultado**, não só o estado instantâneo. citeturn2search12turn2search13

## Como as lacunas são tratadas

Este é provavelmente o refinamento mais importante de todo o documento.

O HTML passou a ter uma seção visível chamada:

> **DADOS IMPORTANTES NÃO DISPONÍVEIS**

No primeiro cenário ela inclui, entre outros:

**nome/identificação civil · idade · sexo/gênero · peso · alergias · medicações habituais · comorbidades/antecedentes · sinais vitais medidos · quantidade/doses · via · horário absoluto das exposições · princípio ativo do “azulzinho” · convulsão · síncope · ideação/comportamento autolesivo · segurança física atual · identificação do acompanhante.**

Isso resolve três ambiguidades perigosas:

**“Não informou convulsão” não vira “não teve convulsão”.**

**“Não existe frequência cardíaca” não vira “FC normal”.**

**“SelfHarm = unknown” não vira “sem risco suicida”.**

No cenário sem uso relatado, o relatório também não interpreta `substanceClass=none` como teste toxicológico negativo. Ele imprime literalmente que:

> **a pessoa relatou não ter usado substância.**

O resumo ainda acrescenta:

> O relato de “não usei nada” deve permanecer como autorrelato, não como exclusão de exposição.

Essa apresentação da incerteza é coerente com a própria orientação de handoff da AHRQ, que explicitamente inclui o **grau de incerteza** entre as informações relevantes na transição do cuidado. citeturn2search13

### O vetor interno não aparece como “risco médico”

Também corrigi outro ponto que considero crítico.

No seu motor existe:

```text
medical       0
impairment    1
isolation     0
emotional     4
environmental 0
uncertainty   0
mixing        2
```

Eu **não colocaria `medical = 0` na frente de um médico como “risco médico 0/4”**.

Isso poderia ser interpretado como avaliação clínica.

No HTML entregue, `P2`, `mixing=2` e o ritmo de resposta ficam claramente apresentados como:

> **metadados internos do motor — não equivalem a triagem clínica.**

Há inclusive esta observação no documento:

> “Não converter o vetor interno `medical=0` em ausência de risco médico.”

O mesmo vale para `P1/P2/P3`: a página declara explicitamente que essas faixas **não correspondem a Manchester, ESI, NEWS2 ou outro escore clínico validado**.

## Arquitetura específica para imprimir e compartilhar como PDF

A versão anterior só “reduzia” o layout de tela durante a impressão. A nova versão trata o PDF como um produto próprio.

CSS para impressão pode ser separado com `@media print`, enquanto `@page` controla características da página impressa, incluindo dimensões e margens. citeturn1search4

O arquivo usa:

```css
@page {
  size: A4 portrait;
  margin: 9mm 10mm 10mm 10mm;
}
```

e organiza explicitamente:

```text
PÁGINA 1
Resumo médico imediato

PÁGINA 2+
Linha do tempo + proveniência técnica
```

A primeira página recebe:

1. cabeçalho;
2. situação;
3. sinais conhecidos;
4. identificação/contexto;
5. exposição;
6. intervenções;
7. informações que faltam;
8. proveniência.

Depois existe uma quebra intencional:

```css
.sheet.page-one {
  break-after: page;
  page-break-after: always;
}
```

`break-inside: avoid` é aplicado aos pequenos blocos e às linhas da tabela, em vez de tentar impedir que uma seção enorme quebre inteira. A propriedade moderna para controlar quebras internas é `break-inside`; `page-break-inside` é mantida apenas como alias de compatibilidade. citeturn1search5turn1search11

As tabelas usam:

```css
thead {
  display: table-header-group;
}
```

e as linhas importantes tentam permanecer inteiras:

```css
tr {
  break-inside: avoid;
  page-break-inside: avoid;
}
```

### O documento continua compreensível sem cores

Isso é particularmente importante para:

- impressora preto-e-branco;
- PDF visualizado com baixo contraste;
- toner econômico;
- impressora hospitalar que ignora backgrounds.

Browsers podem remover ou alterar backgrounds durante impressão, e `print-color-adjust` é apenas uma solicitação ao navegador; preferências do usuário ainda podem se sobrepor. citeturn1search2

Por isso, a versão nova não comunica risco somente através de vermelho, verde ou amarelo.

Na impressão, os cards recebem também rótulos textuais como:

```text
ALERTA ·
ATENÇÃO ·
RELATADO ·
NÃO INFORMADO ·
```

Isso segue o princípio WCAG de que cor não deve ser a única forma de transmitir informação. citeturn1search0 O contraste textual também foi mantido alto; WCAG usa 4,5:1 como referência mínima para texto normal. citeturn1search12

### O que desaparece do PDF

Não são impressos:

- seletor de simulação;
- botões;
- barra sticky;
- controles de tela cheia;
- tooltip;
- toast;
- elementos decorativos de navegação.

Continuam:

- título;
- data/tempo;
- situação;
- origem dos dados;
- unknowns;
- exposições;
- ações;
- cronologia;
- telefone do SAMU;
- telefone toxicológico;
- aviso de verificação clínica.

Portanto, o PDF parece **documento**, e não screenshot de aplicativo.

## Segurança, emergência e privacidade

Mantive o **SAMU 192** como referência de emergência. O Ministério da Saúde informa que o SAMU é serviço pré-hospitalar gratuito, 24 horas, para urgências clínicas, traumáticas, cirúrgicas e psiquiátricas; intoxicação exógena está entre as situações para as quais o serviço pode ser acionado. citeturn0search5turn0search16

Mantive também o **Disque-Intoxicação 0800-722-6001**. A Anvisa informa que o número é gratuito e conecta o usuário a unidades da rede de informação e assistência toxicológica; a central funciona continuamente. citeturn0search0 A lista oficial do Ministério da Saúde mostra que alguns estados também possuem números próprios de CIATox, portanto a implementação futura pode usar localização para complementar o 0800 com o serviço regional, sem substituir o número nacional no documento. citeturn0search4

O CVV não aparece como “especialista” ou “atendimento psicológico” no documento médico. Quando ele for usado na interface do paciente, a denominação correta é **apoio emocional e prevenção do suicídio**; o Ministério da Saúde e o próprio CVV informam que o 188 é gratuito e funciona 24 horas. citeturn3search0turn3search13

Também acrescentei ao PDF:

> **Documento sensível. Pode conter dados de saúde e de vida sexual. Compartilhar somente com finalidade de cuidado e pelo tempo necessário.**

A razão é que a LGPD classifica dados referentes à saúde e à vida sexual, quando vinculados a uma pessoa natural, como **dados pessoais sensíveis**. citeturn4search0turn4search1 Isso importa especialmente no Apollo porque um PDF pode conter simultaneamente crise de saúde, uso de substâncias e informação relacionada a desempenho sexual.

Na versão de produção, portanto, eu trataria “Gerar PDF”, “Gerar link de 6 h” e “Compartilhar” como operações explícitas e separadas. Um PDF baixado é muito mais difícil de revogar do que uma cápsula temporária, então a interface deveria deixar essa diferença bastante clara.

## O mockup final

O arquivo entregue já implementa:

- **duas histórias simuladas reais do seu motor**;
- troca de história na própria página;
- impressão somente do episódio selecionado;
- **A4 portrait**;
- primeira página voltada a leitura rápida;
- cronologia em página separada;
- botão **PDF / imprimir**;
- botão **Copiar resumo**;
- modo tela cheia;
- nenhum backend;
- nenhuma biblioteca externa;
- nenhum login;
- nenhum dado clínico inventado;
- distinção visual e textual entre **relatado / derivado / desconhecido**;
- exposição em linguagem original da pessoa;
- `P1/P2/P3` explicitamente identificados como lógica interna;
- ausência de sinais vitais exibida como ausência de dado, não como normalidade;
- impressão utilizável em preto-e-branco;
- telefone de emergência e toxicologia no documento.

[**Abrir/baixar o HTML final refinado**](sandbox:/mnt/data/sos-apollo-modo-medico-print-refined.html)

A arquitetura resultante é, em essência:

```text
SOS APOLLO · MODO MÉDICO

┌─────────────────────────────────────────────────────────┐
│ RESUMO DE CRISE PARA PROFISSIONAL DE SAÚDE             │
│ Snapshot / horário / ID do episódio                     │
├─────────────────────────────────────────────────────────┤
│ Origem: autorrelato + eventos do app                    │
│ “não informado” ≠ “ausente”                            │
├─────────────────────────────────────────────────────────┤
│ SITUAÇÃO AGORA                                          │
│ Ansiedade muito alta; responsiva; mistura relatada...   │
├─────────────────────────────────────────────────────────┤
│ Responsividade │ Respiração │ Peito │ Ansiedade         │
│ RELATADO       │ RELATADO    │ ...   │ ATENÇÃO          │
│ Convulsão      │ Síncope     │ Autoagressão │ Segurança │
│ NÃO INFORMADO  │ NÃO INFORM. │ NÃO INFORM.  │ ...       │
├─────────────────────────────────────────────────────────┤
│ IDENTIFICAÇÃO / CONTEXTO                                │
├─────────────────────────────────────────────────────────┤
│ EXPOSIÇÃO / USO RELATADO                                │
│ termo │ relato │ tempo/via │ origem │ status            │
├─────────────────────────────────────────────────────────┤
│ O QUE JÁ FOI FEITO                                      │
├─────────────────────────────────────────────────────────┤
│ DADOS IMPORTANTES QUE NÃO EXISTEM                       │
├─────────────────────────────────────────────────────────┤
│ RELATADO PELA PESSOA  |  DERIVADO PELO APP              │
└─────────────────────────────────────────────────────────┘

                     ↓ quebra A4

┌─────────────────────────────────────────────────────────┐
│ LINHA DO TEMPO                                          │
│ tempo │ evento │ origem │ resultado                     │
│ ...                                                     │
├─────────────────────────────────────────────────────────┤
│ METADADOS INTERNOS                                      │
│ P2 = regra do app, não classificação clínica            │
└─────────────────────────────────────────────────────────┘
```

Essa é uma base muito mais segura para o objetivo do Apollo: o médico consegue saber **o que a pessoa contou, o que o aplicativo fez, quando aconteceu, o que ainda não se sabe e quais afirmações vêm apenas do motor** — sem precisar confiar no aplicativo como se ele tivesse feito uma avaliação clínica.