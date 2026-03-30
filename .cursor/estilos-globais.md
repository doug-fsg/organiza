# Estilos globais minimalistas

Classes utilitárias definidas em `src/app/globals.css` para consistência visual em toda a aplicação.

## Spinners (carregamento)

| Classe | Uso |
|--------|-----|
| `app-spinner` | Base do spinner (borda suave, cor primária) |
| `app-spinner-sm` | Pequeno (16px) – botões, inline |
| `app-spinner-md` | Médio (24px) – listas, seções |
| `app-spinner-lg` | Grande (32px) – telas inteiras |
| `app-spinner-inverse` | Para fundos escuros (ex.: botão primário) |

## Containers de carregamento

| Classe | Uso |
|--------|-----|
| `page-loading` | Tela cheia: flex col, centralizado, gap 2 |
| `page-loading-inline` | Seção: flex, centralizado, py-8 |

## Seções e painéis

| Classe | Uso |
|--------|-----|
| `section-muted` | Fundo `muted/20`, borda, rounded |
| `section-muted-subtle` | Fundo `muted/5` (mais sutil) |
| `card-minimal` | Card sem sombra forte |

## Mensagens de estado

| Classe | Uso |
|--------|-----|
| `state-message` | Texto "Carregando...", vazio, etc. (text-sm muted) |
| `state-message-sm` | Versão menor (text-xs) |

## Componente LoadingSpinner

Usar `<LoadingSpinner size="md" text="Carregando..." />` para páginas. O componente já utiliza as classes globais internamente.
