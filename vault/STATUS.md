# STATUS — RDO Digital

**Data:** 2026-05-16  
**Fase:** MVP v2 — completo e pronto para uso local

## Arquivos do sistema

```
index.html                        ← Login (admin@modular.com / admin123)
assets/css/main.css
assets/js/db.js                   ← Dados: users, obras, rdos, linhas, obra_usuarios
assets/js/auth.js
assets/js/utils.js                ← Regras RN01–RN05
assets/js/pdf-gen.js              ← PDF replicando RDO-001 Rev.03

admin/
  dashboard.html                  ← Métricas + alertas (RN04) + nav completa
  obras.html                      ← CRUD obras + vinculação de equipe por obra
  usuarios.html                   ← CRUD usuários RBAC
  rdo-view.html                   ← RDO detail + gerar link cliente + comentário fiscal
  rdo-print.html                  ← Visualização HTML fiel ao template (imprimir/PDF browser)
  historico.html                  ← Histórico com filtros
  relatorio-executivo.html        ← Relatório CEO: KPIs, resumo por obra, desvios, ressalvas

campo/
  home.html                       ← Obras filtradas por vinculação do usuário
  rdo.html                        ← Formulário hora-a-hora + auto-save
  assinatura.html                 ← Pad touch + finalização + gera PDF

cliente/
  ver.html                        ← Portal de aprovação (link com token, sem login)
```

## Fluxo completo

1. **Admin** cadastra obra em `obras.html`
2. **Admin** clica "👥 Equipe" e vincula usuários à obra
3. **Usuário** loga → vê apenas suas obras → preenche RDO hora a hora → assina
4. **Admin** em `rdo-view.html` clica "Gerar Link para Cliente" → copia URL → envia ao cliente
5. **Cliente** acessa a URL, lê o RDO, escreve comentário (opcional), clica "Confirmar Aprovação"
6. **Admin** vê aprovação + comentário do cliente em `rdo-view.html`
7. **CEO/reunião** acessa `relatorio-executivo.html` → seleciona data → imprime ou visualiza

## Regras implementadas
- RN01–RN05 todas ativas
- Vínculo usuário↔obra controlado pelo admin
- Token de acesso cliente (sem login, link com token único)
- Relatório executivo com KPIs, desvios, ressalvas de clientes
