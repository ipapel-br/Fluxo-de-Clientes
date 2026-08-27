# Design System — Fluxo de Clientes

Este documento define as diretrizes, padrões e regras de arquitetura visual do projeto, fundamentado na biblioteca **[Shadcn UI](https://ui.shadcn.com/)** (estilo `new-york`, base `neutral`).

---

## 1. Princípio Fundamental

> **Regra Obrigatória:**  
> Todo e qualquer novo componente ou refatoração de interface DEVE utilizar as primitivas do **Shadcn UI** localizadas em `@/components/ui/*`. É expressamente desencorajado o uso de tags HTML nativas sem estilização ou bibliotecas visuais conflitantes.

---

## 2. Estrutura de Pastas e Componentes

- **`src/components/ui/`**: Componentes primitivos do Shadcn UI baseados em Radix UI e Tailwind CSS.
  - Exemplos: `button.jsx`, `input.jsx`, `select.jsx`, `dialog.jsx`, `card.jsx`, `badge.jsx`, `popover.jsx`, `table.jsx`, `tabs.jsx`, `toast.jsx`, etc.
- **`src/components/{modulo}/`**: Componentes de domínio ou funcionalidades específicas (ex: `src/components/demanda/`).
  - Devem compor exclusivamente os componentes de `@/components/ui/*` e tokens semânticos.
- **`src/lib/`**: Utilitários de apoio, formatadores de data, helpers de cores e configurações.

---

## 3. Tokens Semânticos de Cores (Tailwind + CSS Variables)

Sempre utilize as classes semânticas do Tailwind, que garantem consistência e suporte automático ao Dark Mode:

| Variável Semântica | Classes Tailwind | Uso Recomendado |
|---|---|---|
| `--background` / `--foreground` | `bg-background text-foreground` | Fundo principal da página e cor padrão do texto |
| `--card` / `--card-foreground` | `bg-card text-card-foreground` | Fundo e texto de cartões, listas e containers elevados |
| `--popover` / `--popover-foreground` | `bg-popover text-popover-foreground` | Menus suspensos, selects, tooltips e dropdowns |
| `--primary` / `--primary-foreground` | `bg-primary text-primary-foreground` | Botões principais, links destacados e ações primárias |
| `--secondary` / `--secondary-foreground` | `bg-secondary text-secondary-foreground` | Botões secundários e destaques sutis |
| `--muted` / `--muted-foreground` | `bg-muted text-muted-foreground` | Fundo atenuado, textos secundários, legendas e placeholders |
| `--accent` / `--accent-foreground` | `bg-accent text-accent-foreground` | Itens selecionados em menus, listas e hovers |
| `--destructive` / `--destructive-foreground` | `bg-destructive text-destructive-foreground` | Ações de exclusão, erros e alertas críticos |
| `--border` | `border-border` | Bordas de containers, divisores e cards |
| `--input` | `border-input` | Bordas de inputs, selects e textareas |
| `--ring` | `ring-ring` | Anel de foco acessível em campos interativos |

---

## 4. Padrões de Componentes

### Botões (`@/components/ui/button`)
```jsx
import { Button } from '@/components/ui/button';

// Ação principal
<Button>Adicionar demanda</Button>

// Ação secundária / neutra
<Button variant="outline">Cancelar</Button>

// Ação sutil / ícones
<Button variant="ghost" size="icon"><Pencil size={14} /></Button>

// Ação destrutiva
<Button variant="destructive">Excluir</Button>
```

### Campos de Entrada (`@/components/ui/input`, `@/components/ui/label`)
```jsx
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

<div className="space-y-1.5">
  <Label htmlFor="cliente">Cliente *</Label>
  <Input id="cliente" placeholder="Nome do cliente" />
</div>
```

### Seletores (`@/components/ui/select`)
```jsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

<Select value={valor} onValueChange={setValor}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Selecione um status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="op1">Opção 1</SelectItem>
    <SelectItem value="op2">Opção 2</SelectItem>
  </SelectContent>
</Select>
```

### Modais e Diálogos (`@/components/ui/dialog`)
```jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="sm:max-w-lg">
    <DialogHeader>
      <DialogTitle>Título do Modal</DialogTitle>
    </DialogHeader>
    <div className="py-2">Conteúdo</div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
      <Button onClick={salvar}>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Badges (`@/components/ui/badge`)
```jsx
import { Badge } from '@/components/ui/badge';

<Badge variant="outline">Rotina</Badge>
<Badge variant="secondary">Alta Prioridade</Badge>
<Badge variant="destructive">Urgente</Badge>
```

---

## 5. Diretrizes de UX e Acessibilidade

1. **Focus Rings**: Todos os elementos clicáveis e de entrada devem manter o foco visível padrão (`focus-visible:ring-2 focus-visible:ring-ring`).
2. **Ícones**: Utilizar a biblioteca **Lucide React** (`lucide-react`) padronizada nos tamanhos 14–18px para botões e cabeçalhos.
3. **Feedback Visual**: Utilizar **Sonner** (`sonner`) ou **Toast** (`@/components/ui/toaster`) para mensagens de sucesso/erro.
4. **Layout Responsivo**: Seguir a escala Tailwind (`sm:`, `md:`, `lg:`) garantindo excelente experiência tanto em telas mobile quanto desktop.
