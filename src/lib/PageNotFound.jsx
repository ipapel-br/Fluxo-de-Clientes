import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full">
        <div className="text-center space-y-6">
          {/* 404 Error Code */}
          <div className="space-y-2">
            <h1 className="text-7xl font-extralight text-muted-foreground/40">404</h1>
            <div className="h-0.5 w-16 bg-border mx-auto"></div>
          </div>

          {/* Main Message */}
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              Página Não Encontrada
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A página <span className="font-medium text-foreground">"{pageName}"</span> não foi encontrada nesta aplicação.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <Button asChild variant="outline" className="shadow-2xs">
              <Link to="/">
                <Home size={14} className="mr-2" />
                Voltar para o Início
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
