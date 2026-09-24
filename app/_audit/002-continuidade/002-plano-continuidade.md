# 002 · Continuidade — plano e execução (2026-09-24)

Origem: brainstorm "SOS must remember enough of a person's recent crisis history to be useful when their own memory is
unreliable — while remaining anonymous, low-friction and emotionally non-invasive".

## O que mudou de rumo
- v0.1 assumia "local-first, 12 h, nada sobrevive ao episódio". v0.2 adiciona um **plano de continuidade** (cofre de 180 dias,
  pseudônimo, criptografado no cliente) **ao redor** do núcleo agudo, sem alterar nenhuma decisão dele.
- Coleta silenciosa ≠ coleta secreta: consentimento fora da crise, sem pop-ups em P0/P1, controles visíveis.

## Mapa do projeto (feito nesta sessão)
- `app/_system` é o motor real (registro + núcleo puro + prova exaustiva). O `app/` legado (191 nós, orb GSAP) será substituído.
- Toolchain corrigido: `package.json`, `tsconfig.json`, `vitest.config.ts` voltaram à raiz de `_system` (os scripts resolvem
  caminhos a partir dela; `config/README.md` continua como referência de comandos).
- Baseline verificado: lint 0 erros · tsc strict · 79 testes · 3,15 M estados · build 80 KB.

## Entregas
- `CLAUDE.md` (raiz): instruções fixas do projeto SOS.
- `app/_system/docs/BLUEPRINT-v0.2-CONTINUITY.md`: arquitetura de dois planos, 4 stores, matriz de retenção, identidade
  pseudônima, criptografia, esquema de eventos v2, fila de sync, snapshot, priors, passaporte de crise, cápsulas,
  leis L13–L20, invariantes INV-019–026, 26 fases mapeadas em arquivos, decisões D11–D20.
- ADRs 0006–0009 · `docs/privacy/{DATA-CLASSIFICATION,THREAT-MODEL,RIPD}.md` · `docs/api/VAULT-PROTOCOL.md`.
- Código (fases 0–9 + 20): ver tabela de status no blueprint v0.2 e o diff do PR.

## Achados
- F1. A ordem de estratégias dentro de um skill é o único ponto seguro para personalização histórica: a elegibilidade
  (contraindicações, bloqueios, requisitos) roda antes e não é tocada. Priors só reordenam.
- F2. O `StepResult` já é reproduzível byte a byte, então o diário pode ser derivado dele sem tocar no reducer.
- F3. Texto livre nunca sai de `ingest()`; o diário herda essa garantia por construção (teste de propriedade).
- F4. Ed25519 via WebCrypto permite recuperação determinística por seed sem conta; navegadores antigos ficam só locais (L13).

## Pendências (fora do computador / próximas sessões)
- Servidor do cofre (Cloudflare Worker + D1) conforme `docs/api/VAULT-PROTOCOL.md`.
- Validação jurídica da base legal (D18) e do RIPD.
- Fases 10–19, 21–26.
