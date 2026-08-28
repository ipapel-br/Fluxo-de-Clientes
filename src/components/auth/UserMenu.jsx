import { useState, useRef } from 'react';
import { User, LogOut, ShieldCheck, Palette, Printer, ShoppingBag, Camera, Sun, Moon, Monitor } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { PERFIS, PERFIS_LABELS } from '@/lib/permissoes';

const ROLE_ICONS = {
  [PERFIS.ADMIN]: ShieldCheck,
  [PERFIS.DESIGNER]: Palette,
  [PERFIS.PRINTER]: Printer,
  [PERFIS.SELLER]: ShoppingBag,
};

export default function UserMenu() {
  const { usuario, logout, setLoginModalOpen, atualizarAvatar } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);

  if (!usuario?.nome) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setLoginModalOpen(true)}
        className="h-8 text-xs font-medium"
      >
        <User size={13} className="mr-1.5" /> Identificar-se
      </Button>
    );
  }

  const roleLabel = PERFIS_LABELS[usuario.role] || 'Colaborador';
  const RoleIcon = ROLE_ICONS[usuario.role] || User;

  const iniciais = usuario.nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  const hasAvatar = Boolean(usuario.avatar_url);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    // Limit to 500KB
    if (file.size > 512000) {
      alert('A imagem deve ter no máximo 500KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result;
      if (base64 && atualizarAvatar) {
        atualizarAvatar(base64);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-3 text-xs font-medium hover:border-foreground/30 hover:bg-muted/50 transition shadow-2xs cursor-pointer"
          title={`Conectado como ${usuario.nome} (${roleLabel})`}
        >
          {hasAvatar ? (
            <img
              src={usuario.avatar_url}
              alt={usuario.nome}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold">
              {iniciais || <User size={12} />}
            </div>
          )}
          <div className="flex flex-col text-left leading-tight">
            <span className="font-medium text-foreground truncate max-w-[100px] sm:max-w-[140px]">
              {usuario.nome}
            </span>
            <span className="text-[10px] text-muted-foreground font-normal">
              {roleLabel}
            </span>
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-68 p-3 space-y-3" align="end">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-border">
          {/* Avatar com opção de troca de foto */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group shrink-0 cursor-pointer"
            title="Clique para alterar sua foto"
          >
            {hasAvatar ? (
              <img
                src={usuario.avatar_url}
                alt={usuario.nome}
                className="h-9 w-9 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                {iniciais || <User size={16} />}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera size={14} className="text-white" />
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-foreground truncate">{usuario.nome}</p>
            <p className="text-[11px] text-muted-foreground truncate">{usuario.email}</p>
            <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-foreground/80">
              <RoleIcon size={11} /> {roleLabel}
            </div>
          </div>
        </div>

        {/* Tema visual */}
        <div className="space-y-1.5 pt-0.5">
          <label className="text-[11px] font-medium text-muted-foreground">Aparência</label>
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted/60 rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun size={12} className={theme === 'light' ? 'text-amber-500' : ''} /> Claro
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                theme === 'dark'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon size={12} className={theme === 'dark' ? 'text-sky-400' : ''} /> Escuro
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[11px] font-medium transition cursor-pointer ${
                theme === 'system'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor size={12} /> Auto
            </button>
          </div>
        </div>

        <div className="space-y-1 pt-1 border-t border-border">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-muted rounded-md transition cursor-pointer"
          >
            <Camera size={13} /> Alterar foto de perfil
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition cursor-pointer"
          >
            <LogOut size={13} /> Sair da conta
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

