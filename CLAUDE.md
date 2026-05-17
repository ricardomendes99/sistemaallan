# Projeto sistemaallan — Guia de Sessão

## Cofre Obsidian

O conhecimento do projeto fica em `vault/`. A cada nova sessão:

1. **Listar arquivos do cofre** — `ls vault/` — para saber o que existe
2. **Ler o índice primeiro** — se existir `vault/INDEX.md` ou `vault/MOC.md`, lê-o antes de qualquer outra nota
3. **Carregar sob demanda** — leia só os arquivos relevantes à tarefa atual, nunca todos de uma vez
4. **Nunca reexplicar o que está no cofre** — assuma que o contexto já foi absorvido

## Regras de economia de tokens

- Se uma informação está no cofre, **não peça ao usuário para repetir**
- Prefira ler arquivos pequenos e específicos a ler tudo
- O arquivo `vault/STATUS.md` (quando existir) contém o estado atual do projeto — sempre leia primeiro
- Notas com prefixo `!` são críticas e devem ser lidas imediatamente

## Estrutura esperada do cofre (quando populado)

```
vault/
  INDEX.md       ← mapa geral do projeto (leia sempre)
  STATUS.md      ← estado atual, decisões recentes (leia sempre)
  decisoes/      ← decisões arquitetais
  tarefas/       ← backlog e tasks
  contexto/      ← domínio do negócio, regras
  tecnico/       ← stack, padrões, convenções
```

## Início de sessão

Ao iniciar qualquer sessão neste projeto, execute mentalmente:

```
1. ls vault/
2. Se INDEX.md existe → ler
3. Se STATUS.md existe → ler
4. Confirmar ao usuário: "Cofre carregado. [resumo em 1 linha do que foi lido]"
5. Perguntar o que será feito hoje
```

Se o cofre estiver vazio, informar: "Cofre vazio — posso começar a populá-lo."
