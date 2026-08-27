import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export default function AcessoNegado({ mensagem = 'Você não possui permissão para acessar esta área.' }) {
  const navigate = useNavigate();
  const { initialRoute } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4 shadow-sm">
        <ShieldAlert size={28} />
      </div>
      <h2 className="text-xl font-bold text-foreground">Acesso Restrito</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        {mensagem}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={() => navigate(initialRoute || '/')}>
          Ir para minha área principal
        </Button>
      </div>
    </div>
  );
}
