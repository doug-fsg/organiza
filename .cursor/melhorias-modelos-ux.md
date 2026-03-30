# Melhorias: Sistema de Modelos (UI/UX e Experiência do Usuário)

Análise do fluxo de **Modelos de Tarefas** (templates/subtask models): criação, listagem, uso e edição.

---

## 1. Reordenação de etapas (formulário)

**Problema:** Só existe botão para **subir** a etapa (ícone `GripVertical` age como “mover para cima”). Não há como **descer** uma etapa nem arrastar-e-soltar.

**Sugestão:**
- Adicionar botão “descer” (ou setas ↑/↓) para cada etapa.
- Ou usar **drag-and-drop** (ex.: `@dnd-kit/core` ou similar) para reordenar, alinhado ao uso de “etapas em sequência”.

---

## 2. Estado do formulário ao cancelar

**Problema:** Ao abrir “Novo modelo”, preencher nome/etapas e clicar em **Cancelar**, os campos **não são limpos**. Na próxima abertura o usuário vê o rascunho anterior.

**Sugestão:**
- Ao fechar o dialog (`onOpenChange(false)`), resetar `name`, `description` e `stages` no formulário de **criação**.
- Ou perguntar “Descartar alterações?” quando houver conteúdo e o usuário fechar.

---

## 3. Dialog “Novo projeto” (usar modelo)

**Problema:** O botão **“Criar projeto”** não indica carregamento nem fica desabilitado durante a mutation. O usuário pode clicar várias vezes ou achar que nada aconteceu.

**Sugestão:**
- Usar `createProjectFromModel.isPending` (ou o estado da mutation que chama `onUseModel`) para:
  - `disabled={isPending}` no botão.
  - Texto do botão: “Criando...” quando `isPending`.
- Garantir que o dialog de “Novo projeto” receba e use esse estado (via props ou contexto).

---

## 4. Criar modelo a partir de projeto existente

**Problema:** A API expõe `createFromMainTask` (criar modelo a partir de um projeto), mas **não há entrada na interface** para isso.

**Sugestão:**
- Na tela de **Gerenciamento de Projetos** (ou no card do projeto), adicionar ação **“Salvar como modelo”** que:
  - Abre um pequeno dialog (nome + descrição opcional).
  - Chama `subtaskTemplate.createFromMainTask` com o `mainTaskId` do projeto.
- Na página **Modelos**, opcionalmente um atalho tipo “Criar modelo a partir de um projeto” que leva a uma lista de projetos para escolher.

---

## 5. Duplicação entre formulário de criação e edição

**Problema:** `SubtaskModelForm` (criar) e `SubtaskModelEditForm` (editar) repetem muita lógica e layout (etapas, move/remove, selects, validação).

**Sugestão:**
- Extrair um componente interno (ex.: `ModelStagesEditor`) com:
  - Lista de etapas, add/remove/move, responsável/setor, “Requer aprovação”.
- Criar e editar passam a usar esse componente e diferem só em título do dialog, submit e origem dos dados (vazio vs. `model`).

---

## 6. Feedback e acessibilidade

**Problema:** Poucos elementos com `aria-label`; ícone de reordenar não deixa claro “subir etapa”; nenhum tooltip nas ações.

**Sugestão:**
- `aria-label` em todos os botões de ação (ex.: “Subir etapa”, “Remover etapa”, “Opções do modelo”).
- Tooltips (shadcn `Tooltip`) em:
  - Botão “Usar exemplo” (“Preenche com etapas de exemplo de venda de imóvel”).
  - Ícone de reordenar (“Subir etapa” / “Descer etapa” quando existir).
  - Itens do dropdown do card (Ver, Editar, Novo projeto, Deletar).
- No dialog de criação/edição, garantir `DialogTitle` e foco inicial no primeiro campo (nome) quando abrir.

---

## 7. Lista de modelos (cards)

**Problema:** “Ver” e “Editar” aparecem no dropdown **e** como links pequenos no rodapé do card. Duplicação e possível confusão.

**Sugestão:**
- Manter **uma** forma de acesso: ou só dropdown, ou só botões/links no card. Se preferir destaque para “Novo projeto”, manter esse botão principal e deixar Ver/Editar/Deletar só no menu (⋯).

---

## 8. Empty state

**Problema:** O empty state está claro (“Nenhum modelo de tarefas”), mas não orienta o próximo passo.

**Sugestão:**
- Incluir um botão **“Criar primeiro modelo”** (ou “Novo modelo”) no próprio empty state que abre o mesmo dialog de novo modelo.
- Opcional: uma linha explicando que dá para usar “Usar exemplo” no formulário para começar rápido.

---

## 9. Validação em tempo real (opcional)

**Problema:** Validação só ocorre no submit (“Nome obrigatório”, “Pelo menos 2 etapas”).

**Sugestão:**
- Mostrar aviso discreto (ex.: sob o campo nome ou no rodapé do dialog) quando:
  - Nome vazio ao sair do campo (onBlur) ou ao tentar enviar.
  - Menos de 2 etapas válidas (título preenchido).
- Manter o bloqueio no submit; a validação em tempo real só melhora a descoberta do erro.

---

## 10. Descrição do modelo no dialog “Novo projeto”

**Problema:** No dialog “Novo projeto” só aparece o nome do modelo na descrição. Quem tem muitos modelos parecidos pode querer ver a descrição do modelo.

**Sugestão:**
- Se o modelo tiver `description`, exibir um trecho no `DialogDescription` (ou em uma linha abaixo) do dialog “Novo projeto”, para confirmar que é o modelo certo.

---

## Resumo de prioridade

| Prioridade | Item | Impacto |
|-----------|------|--------|
| Alta      | 3 – Loading no “Criar projeto” | Evita duplo submit e confusão |
| Alta      | 2 – Reset do form ao cancelar  | Evita enviar dados antigos por engano |
| Média     | 1 – Reordenar etapas (descer / drag) | UX do formulário de etapas |
| Média     | 4 – Criar modelo a partir de projeto | Funcionalidade já existente na API |
| Média     | 8 – Botão no empty state       | Navegação mais óbvia |
| Baixa     | 5 – Extrair componente de etapas | Manutenção e consistência |
| Baixa     | 6 – Tooltips e aria-labels     | Acessibilidade e descoberta |
| Baixa     | 7 – Unificar Ver/Editar no card | Interface mais limpa |
| Baixa     | 9 e 10 – Validação e descrição  | Refino de UX |

Implementar na ordem 3 → 2 → 1 (e depois 4 e 8) tende a dar o maior ganho rápido em clareza e confiança no uso dos modelos.
