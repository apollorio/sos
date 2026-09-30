# RIPD — Relatório de Impacto à Proteção de Dados Pessoais (rascunho v0.2)

> Modelo conforme orientação ANPD. Deve ser validado por advogado(a) especialista em LGPD antes de qualquer sincronização
> remota em produção (decisão D18 do Blueprint v0.2).

## 1. Identificação
- Controlador: apollo::rio (projeto voluntário, sem fins lucrativos) — sos.apollo.rio.br
- Encarregado (DPO): a definir
- Sistema: SOS Apollo — Harm Control Runtime, plano de continuidade (cofre de 180 dias)

## 2. Descrição do tratamento
- **Finalidade:** lembrar, para a própria pessoa e para quem ela escolher, o que aconteceu e o que ajudou em episódios de
  crise, quando a memória dela pode falhar; personalizar a ordem de estratégias seguras.
- **Dados tratados:** ver `DATA-CLASSIFICATION.md`. Categorias sensíveis: saúde (estado relatado), contexto de uso de
  substâncias (classe, apenas quando relatada explicitamente). Nenhum identificador civil.
- **Origem:** a própria pessoa ou quem está ajudando, por toques em cartões; nunca texto livre armazenado.
- **Compartilhamento:** apenas por cápsulas criadas pela pessoa/ajudante, com escopo, expiração e revogação.
- **Retenção:** 180 dias (continuidade), 12 h (estado agudo), 30 dias (segurança), 0 (texto livre).
- **Base legal:** consentimento específico e destacado (art. 11, I) para a continuidade rotineira; tutela da vida
  (art. 11, II, e) reservada ao processamento agudo indispensável — nunca como justificativa para armazenar tudo.

## 3. Necessidade e proporcionalidade
- Minimização por construção: matriz de retenção no registro; lint impede campos fora da matriz.
- Sem perfilamento automatizado de saúde/personalidade (Res. CD/ANPD nº 2/2022 — critérios de alto risco): o sistema
  registra recorrência operacional, não infere diagnóstico (L16, INV-023).

## 4. Riscos e medidas
Ver `THREAT-MODEL.md`. Riscos residuais: perda do dispositivo e da chave de recuperação (perda do histórico, não da
segurança); vazamento de link de cápsula (limitado por expiração/visualizações).

## 5. Direitos do titular
- Acesso e portabilidade: exportação local do cofre (JSON criptografado + chave).
- Eliminação: "Apagar agora" (dispositivo) e "Apagar cofre" (remoto, por assinatura da chave).
- Revogação de consentimento: desliga a sincronização; o app continua funcionando (L13).

## 6. Aprovações
| Data | Responsável | Parecer |
|---|---|---|
| — | — | pendente |
