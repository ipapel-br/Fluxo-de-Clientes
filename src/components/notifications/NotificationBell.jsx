import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Clock,
  Sparkles,
  Layers,
  Palette,
  Printer,
  CheckCircle2,
  RotateCcw,
  Edit3,
  UserCheck,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/ui/UserAvatar';
import { localClient } from '@/api/localClient';
import { useAuth } from '@/contexts/AuthContext';
import {
  isNotificacaoParaUsuario,
  isNotificacaoLida,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  excluirNotificacao,
  limparTodasNotificacoes,
  NOTIFICATION_TYPES,
} from '@/lib/notificationService';

const TYPE_ICONS = {
  [NOTIFICATION_TYPES.ALTERACAO]: Edit3,
  [NOTIFICATION_TYPES.ATRIBUICAO]: UserCheck,
  [NOTIFICATION_TYPES.STATUS]: Layers,
  [NOTIFICATION_TYPES.FASE_ARTE]: Palette,
  [NOTIFICATION_TYPES.IMPRESSAO]: Printer,
  [NOTIFICATION_TYPES.CONCLUSAO]: CheckCircle2,
  [NOTIFICATION_TYPES.REABERTURA]: RotateCcw,
};

const TYPE_COLORS = {
  [NOTIFICATION_TYPES.ALTERACAO]: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
  [NOTIFICATION_TYPES.ATRIBUICAO]: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  [NOTIFICATION_TYPES.STATUS]: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
  [NOTIFICATION_TYPES.FASE_ARTE]: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20',
  [NOTIFICATION_TYPES.IMPRESSAO]: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  [NOTIFICATION_TYPES.CONCLUSAO]: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
  [NOTIFICATION_TYPES.REABERTURA]: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
};

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
  } catch {
    return '';
  }
}

export default function NotificationBell() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroAba, setFiltroAba] = useState('todas'); // 'todas' | 'nao_lidas'

  const carregarNotificacoes = useCallback(async () => {
    if (!usuario) return;
    try {
      const list = await localClient.entities.Notificacao.list('-created_at', 100);
      setNotificacoes(list || []);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    }
  }, [usuario]);

  useEffect(() => {
    carregarNotificacoes();

    const handleCreated = () => carregarNotificacoes();
    const handleUpdated = () => carregarNotificacoes();

    window.addEventListener('fluxo-clientes:notificacao-criada', handleCreated);
    window.addEventListener('fluxo-clientes:notificacao-atualizada', handleUpdated);

    // Polling a cada 15 segundos para atualizar badges se houver novos eventos
    const interval = setInterval(carregarNotificacoes, 15000);

    return () => {
      window.removeEventListener('fluxo-clientes:notificacao-criada', handleCreated);
      window.removeEventListener('fluxo-clientes:notificacao-atualizada', handleUpdated);
      clearInterval(interval);
    };
  }, [carregarNotificacoes]);

  // Filtrar apenas notificações destinadas a este usuário
  const minhasNotificacoes = useMemo(() => {
    if (!usuario) return [];
    return (notificacoes || []).filter((n) => isNotificacaoParaUsuario(n, usuario));
  }, [notificacoes, usuario]);

  // Contagem de não lidas
  const naoLidasCount = useMemo(() => {
    if (!usuario) return 0;
    return minhasNotificacoes.filter((n) => !isNotificacaoLida(n, usuario)).length;
  }, [minhasNotificacoes, usuario]);

  // Lista exibida conforme a aba
  const notificacoesExibidas = useMemo(() => {
    if (filtroAba === 'nao_lidas') {
      return minhasNotificacoes.filter((n) => !isNotificacaoLida(n, usuario));
    }
    return minhasNotificacoes;
  }, [minhasNotificacoes, filtroAba, usuario]);

  async function handleClicarNotificacao(notif) {
    if (!usuario) return;
    const userKey = usuario.email || usuario.nome || usuario.id;

    // Atualização otimista imediata
    setNotificacoes((prev) =>
      prev.map((n) =>
        n.id === notif.id
          ? { ...n, read_by: [...(Array.isArray(n.read_by) ? n.read_by : []), userKey] }
          : n
      )
    );

    // Marcar como lida no backend
    marcarNotificacaoComoLida(notif.id, usuario);

    setOpen(false);

    // Redirecionar para o destino apropriado
    const destino = notif.link_path || '/';
    navigate(destino);

    // Destaque visual suave (scroll para o elemento se existir)
    if (notif.demanda_id) {
      setTimeout(() => {
        const elem = document.getElementById(`demanda-${notif.demanda_id}`);
        if (elem) {
          elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
          elem.classList.add('ring-2', 'ring-primary', 'transition-all', 'duration-500');
          setTimeout(() => {
            elem.classList.remove('ring-2', 'ring-primary');
          }, 3000);
        }
      }, 300);
    }
  }

  async function handleMarcarIndividual(e, notif) {
    e.stopPropagation();
    if (!usuario) return;
    const userKey = usuario.email || usuario.nome || usuario.id;

    // Atualização otimista
    setNotificacoes((prev) =>
      prev.map((n) =>
        n.id === notif.id
          ? { ...n, read_by: [...(Array.isArray(n.read_by) ? n.read_by : []), userKey] }
          : n
      )
    );

    await marcarNotificacaoComoLida(notif.id, usuario);
    await carregarNotificacoes();
  }

  async function handleExcluirIndividual(e, notif) {
    e.stopPropagation();
    if (!usuario) return;

    // Atualização otimista
    setNotificacoes((prev) => prev.filter((n) => n.id !== notif.id));

    await excluirNotificacao(notif.id);
    await carregarNotificacoes();
  }

  async function handleMarcarTodasLidas() {
    if (!usuario) return;
    setLoading(true);
    const userKey = usuario.email || usuario.nome || usuario.id;

    // Atualização otimista imediata na interface
    setNotificacoes((prev) =>
      prev.map((n) => {
        if (isNotificacaoParaUsuario(n, usuario)) {
          const currentRead = Array.isArray(n.read_by) ? n.read_by : [];
          return { ...n, read_by: [...currentRead, userKey] };
        }
        return n;
      })
    );

    try {
      await marcarTodasNotificacoesComoLidas(usuario);
      await carregarNotificacoes();
    } finally {
      setLoading(false);
    }
  }

  async function handleLimparTodas() {
    if (!usuario) return;
    setLoading(true);

    // Atualização otimista imediata na interface
    setNotificacoes((prev) => prev.filter((n) => !isNotificacaoParaUsuario(n, usuario)));

    try {
      await limparTodasNotificacoes(usuario);
      await carregarNotificacoes();
    } finally {
      setLoading(false);
    }
  }

  if (!usuario) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer shadow-2xs"
          title="Notificações"
          aria-label="Abrir notificações"
        >
          <Bell size={17} className={naoLidasCount > 0 ? 'text-primary fill-primary/10' : ''} />
          {naoLidasCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50">
              {naoLidasCount > 99 ? '99+' : naoLidasCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-80 sm:w-96 p-0 shadow-2xl rounded-2xl border-border bg-card overflow-hidden"
        align="end"
        sideOffset={8}
      >
        {/* Cabeçalho */}
        <div className="p-3.5 border-b border-border/80 bg-muted/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-foreground tracking-tight">Notificações</h3>
            {naoLidasCount > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-bold h-5">
                {naoLidasCount} novas
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {naoLidasCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarcarTodasLidas}
                disabled={loading}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground cursor-pointer"
                title="Marcar todas como lidas"
              >
                <CheckCheck size={13} className="mr-1 text-primary" /> Ler todas
              </Button>
            )}
            {minhasNotificacoes.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLimparTodas}
                disabled={loading}
                className="h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-destructive cursor-pointer flex items-center gap-1"
                title="Excluir todas as notificações"
              >
                <Trash2 size={13} />
                <span className="hidden sm:inline">Excluir</span>
              </Button>
            )}
          </div>
        </div>

        {/* Abas de visualização rápida */}
        <div className="flex items-center border-b border-border/60 bg-muted/10 px-3 py-1.5 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFiltroAba('todas')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
              filtroAba === 'todas'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            Todas ({minhasNotificacoes.length})
          </button>
          <button
            type="button"
            onClick={() => setFiltroAba('nao_lidas')}
            className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer flex items-center gap-1.5 ${
              filtroAba === 'nao_lidas'
                ? 'bg-background text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            }`}
          >
            Não lidas
            {naoLidasCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                {naoLidasCount}
              </span>
            )}
          </button>
        </div>

        {/* Lista de Notificações */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40">
          {notificacoesExibidas.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
                <Sparkles size={18} />
              </div>
              <p className="text-xs font-semibold text-foreground">
                {filtroAba === 'nao_lidas' ? 'Nenhuma notificação não lida' : 'Você está em dia!'}
              </p>
              <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto">
                {filtroAba === 'nao_lidas'
                  ? 'Todas as suas notificações foram visualizadas.'
                  : 'Quando alguém fizer alterações em suas demandas, elas aparecerão aqui.'}
              </p>
            </div>
          ) : (
            notificacoesExibidas.map((notif) => {
              const lida = isNotificacaoLida(notif, usuario);
              const IconComp = TYPE_ICONS[notif.tipo] || Bell;
              const colorClass = TYPE_COLORS[notif.tipo] || 'text-muted-foreground bg-muted';

              return (
                <div
                  key={notif.id}
                  onClick={() => handleClicarNotificacao(notif)}
                  className={`group relative p-3 flex items-start gap-3 transition cursor-pointer hover:bg-muted/50 ${
                    !lida ? 'bg-primary/5 font-medium' : 'opacity-85'
                  }`}
                >
                  {/* Ponto indicador de não lida */}
                  {!lida && (
                    <span className="absolute left-1.5 top-4 h-2 w-2 rounded-full bg-primary" />
                  )}

                  {/* Avatar do Autor ou Ícone */}
                  <div className="relative shrink-0 mt-0.5">
                    <UserAvatar
                      name={notif.actor_name}
                      src={notif.actor_avatar}
                      size="sm"
                    />
                    <div
                      className={`absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-background ${colorClass}`}
                    >
                      <IconComp size={9} className="stroke-[2.5]" />
                    </div>
                  </div>

                  {/* Conteúdo textual */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-baseline justify-between gap-1">
                      <p className="text-xs font-bold text-foreground truncate">
                        {notif.titulo}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Clock size={9} />
                        {formatRelativeTime(notif.created_at)}
                      </span>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.mensagem}
                    </p>

                    <div className="pt-1 flex items-center justify-between gap-1.5">
                      {notif.cliente_nome ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted/80 text-foreground/80 truncate max-w-[180px]">
                          {notif.cliente_nome}
                        </span>
                      ) : (
                        <span />
                      )}

                      {/* Ações individuais ao passar o mouse ou em mobile */}
                      <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {!lida && (
                          <button
                            type="button"
                            onClick={(e) => handleMarcarIndividual(e, notif)}
                            className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted/80 transition cursor-pointer"
                            title="Marcar como lida"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleExcluirIndividual(e, notif)}
                          className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          title="Excluir notificação"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

