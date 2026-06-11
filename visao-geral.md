# Visão Geral — Finanças Diárias Estilo Caderno

## Descrição

Ferramenta de controle financeiro pessoal com visual inspirado em caderno de anotações. Permite registrar saldos bancários, lançamentos de entradas e saídas, e acompanhar a previsão de saldo do mês em tempo real. Todos os dados são salvos localmente no navegador — sem cadastro, sem servidor de dados, sem dependência de rede.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework front-end | Vue 3 (Options API via `defineComponent`) |
| Linguagem | TypeScript |
| Build | Vite 6 |
| Estilização | Tailwind CSS 4 com plugin `@tailwindcss/vite` |
| Ícones | `lucide-vue-next` |
| Datas | `date-fns` com locale `pt-BR` |
| Persistência | `localStorage` do navegador |
| Servidor de produção | Express (serve os assets estáticos do `dist/`) |
| Fontes | Inter (sans) + JetBrains Mono (mono) via Google Fonts |

Não há biblioteca de componentes UI (sem shadcn, Vuetify, PrimeVue etc.). Todo o visual é construído com utilitários Tailwind e HTML puro.

---

## Estrutura de Arquivos

```
financas-diarias-estilo-caderno/
├── index.html                        # Ponto de entrada da SPA (lang="pt-BR")
├── metadata.json                     # Nome e descrição do projeto
├── vite.config.ts                    # Configuração do Vite (plugins Vue + Tailwind)
├── tsconfig.json                     # TypeScript para o front-end
├── tsconfig.server.json              # TypeScript para o servidor Express
├── server.ts                         # Servidor Express para produção
└── src/
    ├── main.ts                       # Bootstrap: createApp + mount
    ├── App.vue                       # Componente raiz — toda a aplicação
    ├── index.css                     # Tailwind + tema customizado + animações CSS
    └── composables/
        └── useLocalStorage.ts        # Helpers loadFromStorage / saveToStorage
```

A aplicação inteira vive em um único componente: `src/App.vue`.

---

## Arquitetura

### Componente único

Todo o código de interface, lógica e estado reside em `src/App.vue`. Não há subcomponentes separados. O template está dividido em seções semânticas:

- **Header** — título, navegação de mês (anterior/próximo) e botão de menu
- **Saldos e Faturas** — lista de contas com inputs de saldo editáveis inline
- **Entradas e Saídas** — formulário de novo lançamento + lista animada com estilo de caderno
- **Footer fixo** — painel flutuante com previsão de saldo e total pendente
- **Side Drawer** — painel lateral deslizante (direita → esquerda) com modelos de lançamentos fixos e zona de perigo
- **Modal da aplicação** — overlay centralizado que substitui `alert()`, `confirm()` e `prompt()` nativos do navegador

### Persistência de dados

Três chaves no `localStorage`:

| Chave | Tipo | Conteúdo |
|---|---|---|
| `fin_account_defs` | `AccountDef[]` | Definição das contas (id + nome) |
| `fin_month_pages` | `Record<string, PageData>` | Lançamentos e saldos por mês (`yyyy-MM`) |
| `fin_fixed_templates` | `FixedTemplate[]` | Modelos de lançamentos fixos recorrentes |

Watchers profundos em cada propriedade reativa disparam `saveToStorage` automaticamente a cada alteração.

### Interfaces de dados

```ts
interface AccountDef {
  id: string;
  name: string;
}

interface Entry {
  id: string;
  description: string;
  value: number;        // positivo = entrada, negativo = saída
  isPaid: boolean;
  createdAt: number;    // timestamp Unix
  fixedTemplateId?: string;
}

interface FixedTemplate {
  id: string;
  description: string;
  value: number;
}

interface PageData {
  entries: Entry[];
  balances: Record<string, number>; // accountId → valor
}
```

---

## Funcionalidades

### Contas e saldos
- Cadastro de contas/cartões via modal da aplicação
- Reordenação manual com botões de seta (cima/baixo)
- Input de saldo inline por conta, aceita valores negativos e decimais com vírgula ou ponto
- Somatório automático exibido como "Saldo Atual Bancário"
- Remoção de conta com confirmação via modal destrutivo

### Lançamentos
- Formulário com campo de descrição, valor (aceita negativos) e botão de fixar (pin)
- Lançamentos positivos = entradas (verde), negativos = saídas (vermelho)
- Marcar como pago/pendente com toggle (ícone de círculo)
- Remover lançamento individualmente
- Lista animada com `TransitionGroup` (slide + fade)
- Decoração visual de caderno com linhas horizontais e margem vermelha

### Lançamentos fixos (recorrentes)
- Ao adicionar um lançamento com o botão de pin ativado, ele é salvo como modelo fixo
- Modelos são gerenciados no drawer lateral
- Botão "Aplicar ao mês" insere todos os modelos ainda não aplicados no mês atual
- Contador de pendentes exibido como badge
- Remoção de modelo com confirmação via modal destrutivo
- Desafixar um lançamento do modelo sem apagá-lo (ícone PinOff)

### Navegação por mês
- Navega entre meses com botões de seta
- Cada mês tem seus próprios lançamentos e saldos isolados
- Modelos fixos são globais (compartilhados entre meses)

### Painel de resumo (footer)
- Fixo na parte inferior da tela
- "Previsão de Saldo" = saldo atual bancário + soma dos lançamentos pendentes
- "Pendente" = soma dos lançamentos não marcados como pagos
- Animação de entrada com slide-up na montagem do componente

### Reset de mês
- Disponível na "Zona de Perigo" do drawer
- Remove todos os lançamentos do mês aberto
- Modelos fixos são preservados
- Requer confirmação via modal destrutivo

---

## Sistema de Modal

A aplicação não usa `alert()`, `confirm()` ou `prompt()` do navegador. Todos foram substituídos por um sistema de modal próprio, baseado em Promises:

| Método | Retorno | Uso |
|---|---|---|
| `showAlert(message)` | `Promise<void>` | Mensagem informativa com botão OK |
| `showConfirm(message, isDestructive?)` | `Promise<boolean>` | Confirmação com Cancelar + Confirmar (vermelho se destrutivo) |
| `showPrompt(message)` | `Promise<string \| null>` | Input de texto com Cancelar + Confirmar |

O modal é controlado pelo estado reativo `modal` em `data()` e renderizado no template com `<Transition>` (animação `modal-fade` no backdrop e `modal-scale` no card). Fecha com `Escape`, clique no backdrop ou nos botões de ação.

---

## Animações e Transições

| Nome CSS | Elemento | Efeito |
|---|---|---|
| `entry` | Itens da lista de lançamentos | Slide + fade ao entrar/sair, via `TransitionGroup` |
| `footer` | Painel de resumo fixo | Slide-up ao montar (com `appear`) |
| `drawer-fade` | Backdrop do drawer | Fade in/out |
| `drawer-slide` | Painel do drawer | Slide da direita com `cubic-bezier(0.32, 0.72, 0, 1)` |
| `modal-fade` | Backdrop do modal | Fade in/out |
| `modal-scale` | Card do modal | Fade + scale de 95% → 100% com bounce suave |

---

## Tema Visual

Definido via bloco `@theme` do Tailwind CSS 4 em `src/index.css`:

| Token | Valor | Uso |
|---|---|---|
| `--color-paper` | `#F8F7F4` | Fundo geral, cards |
| `--color-ink` | `#1A1A1A` | Texto principal, botões primários |
| `--color-line` | `rgba(26,26,26,0.08)` | Linhas de caderno, bordas sutis |
| `--font-sans` | Inter | Corpo de texto |
| `--font-mono` | JetBrains Mono | Valores monetários, datas |

Cores semânticas de valores: `emerald-600` para positivos, `red-500` para negativos.

---

## Servidor de Produção

`server.ts` é um servidor Express mínimo que:
- Serve os assets estáticos de `dist/` com cache de 1 ano (exceto `index.html`, sem cache)
- Redireciona qualquer rota para `index.html` (SPA fallback)
- Expõe endpoint `/health` para health checks
- Responde a `SIGTERM` e `SIGINT` para shutdown gracioso
- Porta configurável via variável de ambiente `PORT` (padrão: `3000`)

O build completo (`npm run build`) executa em sequência: `vue-tsc --noEmit` → `vite build` → `tsc -p tsconfig.server.json`.

---

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento na porta 3000 (HMR ativado) |
| `npm run build` | Checagem de tipos + build do front + build do servidor |
| `npm run start` | Inicia o servidor Express de produção |
| `npm run preview` | Preview do build via Vite |
| `npm run lint` | Checagem de tipos com `vue-tsc` |
| `npm run clean` | Remove `dist/` e `dist-server/` |
