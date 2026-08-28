import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

export default function ThemeToggle({ align = 'end', className = '' }) {
  const { theme, resolvedTheme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`relative h-9 w-9 rounded-full border-border bg-card hover:bg-muted/60 transition cursor-pointer shadow-2xs ${className}`}
          title="Alternar tema visual"
          aria-label="Alternar tema visual"
        >
          <Sun
            size={16}
            className={`transition-all duration-300 ${
              resolvedTheme === 'dark'
                ? 'rotate-90 scale-0 opacity-0'
                : 'rotate-0 scale-100 opacity-100 text-amber-500'
            }`}
          />
          <Moon
            size={16}
            className={`absolute transition-all duration-300 ${
              resolvedTheme === 'dark'
                ? 'rotate-0 scale-100 opacity-100 text-sky-400'
                : '-rotate-90 scale-0 opacity-0'
            }`}
          />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-[140px] p-1 shadow-lg rounded-xl">
        <DropdownMenuItem
          onClick={() => setTheme('light')}
          className="flex items-center justify-between text-xs font-medium cursor-pointer py-1.5 px-2 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Sun size={14} className="text-amber-500" />
            <span>Claro</span>
          </div>
          {theme === 'light' && <Check size={14} className="text-primary ml-2" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className="flex items-center justify-between text-xs font-medium cursor-pointer py-1.5 px-2 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Moon size={14} className="text-sky-400" />
            <span>Escuro</span>
          </div>
          {theme === 'dark' && <Check size={14} className="text-primary ml-2" />}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => setTheme('system')}
          className="flex items-center justify-between text-xs font-medium cursor-pointer py-1.5 px-2 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Monitor size={14} className="text-muted-foreground" />
            <span>Sistema</span>
          </div>
          {theme === 'system' && <Check size={14} className="text-primary ml-2" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
