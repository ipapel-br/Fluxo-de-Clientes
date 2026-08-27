import { useState } from 'react';
import { Mail, Sparkles, LogIn, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/ui/border-beam';
import DotsCanvas from '@/components/ui/DotsCanvas';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginDialog() {
  const { entrarComEmail, loginModalOpen, setLoginModalOpen, isAutenticado } = useAuth();
  const [emailLogin, setEmailLogin] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const canClose = isAutenticado;

  async function handleLogin(e) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const res = await entrarComEmail(emailLogin);
      if (!res.success) {
        setErro(res.error || 'Erro ao autenticar.');
      }
    } finally {
      setCarregando(false);
    }
  }

  const formContent = (
    <div className="relative z-10 space-y-4">
      <div className="text-center pb-1 space-y-1.5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-2 shadow-xs">
          <Sparkles size={22} />
        </div>
        <h2 className="text-xl font-bold text-center text-foreground tracking-tight">
          Acesso ao Fluxo de Clientes
        </h2>
        <p className="text-xs text-center text-muted-foreground">
          Acesso restrito para colaboradores autorizados. Informe seu e-mail corporativo.
        </p>
      </div>

      {erro && (
        <div className="p-3 text-xs rounded-lg bg-destructive/10 text-destructive font-medium border border-destructive/20 flex items-start gap-2 leading-relaxed animate-in fade-in">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
        <div className="space-y-1.5">
          <Label htmlFor="login-email-input" className="text-xs font-semibold flex items-center gap-1.5">
            <Mail size={13} /> E-mail autorizado
          </Label>
          <Input
            id="login-email-input"
            name="auth_login_email_field"
            type="email"
            value={emailLogin}
            onChange={(e) => setEmailLogin(e.target.value)}
            placeholder="seu.email@empresa.com"
            className="h-10 text-sm"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            data-lpignore="true"
            autoFocus
            required
          />
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Button
            type="submit"
            disabled={carregando || !emailLogin.trim()}
            className="w-full font-semibold h-10 shadow-xs"
          >
            <LogIn size={15} className="mr-1.5" />
            {carregando ? 'Verificando autorização...' : 'Acessar Sistema'}
          </Button>
          {canClose && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setLoginModalOpen(false)}
              className="w-full text-xs"
            >
              Voltar
            </Button>
          )}
        </div>
      </form>

      <div className="pt-2 text-center text-[11px] text-muted-foreground border-t border-border/60">
        Precisa de acesso? Solicite o cadastro ao Administrador da empresa.
      </div>
    </div>
  );

  // Se não estiver autenticado, exibe tela de login em tela cheia com DotsCanvas e centralização perfeita
  if (!isAutenticado) {
    return (
      <div className="fixed inset-0 z-50 bg-[#000000] flex items-center justify-center p-4">
        <DotsCanvas />
        <div className="relative z-10 w-full max-w-[380px] rounded-2xl border border-border bg-card p-6 shadow-2xl overflow-hidden">
          <BorderBeam duration={8} size={150} />
          {formContent}
        </div>
      </div>
    );
  }

  // Se estiver autenticado e abriu o modal (para trocar de usuário)
  return (
    <Dialog
      open={loginModalOpen}
      onOpenChange={(open) => {
        if (!open && !canClose) return;
        setLoginModalOpen(open);
      }}
    >
      <DialogContent className="sm:max-w-[380px] p-6 relative overflow-hidden">
        <BorderBeam duration={8} size={150} />
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
