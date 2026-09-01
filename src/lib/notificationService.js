import { localClient } from '@/api/localClient';
import { PERFIS } from '@/lib/permissoes';

/**
 * Tipos de Notificações suportados
 */
export const NOTIFICATION_TYPES = {
  ALTERACAO: 'alteracao',
  ATRIBUICAO: 'atribuicao',
  STATUS: 'status',
  FASE_ARTE: 'fase_arte',
  IMPRESSAO: 'impressao',
  CONCLUSAO: 'conclusao',
  REABERTURA: 'reabertura',
};

function parseArrayField(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Not JSON, return as single string item
    }
    return [value];
  }
  return [];
}

/**
 * Formata lista de destinatários com base na demanda e no autor da ação
 * @param {Object} demanda - Demanda associada
 * @param {Object} autor - Usuário que fez a ação
 * @returns {Array<string>} Lista de nomes/emails/IDs dos alvos
 */
export function calcularDestinatarios(demanda, autor) {
  const alvos = new Set();

  if (demanda?.vendedor) {
    alvos.add(demanda.vendedor.trim().toLowerCase());
  }
  if (demanda?.seller_id) {
    alvos.add(demanda.seller_id);
  }
  if (demanda?.designer) {
    alvos.add(demanda.designer.trim().toLowerCase());
  }
  if (demanda?.designer_id) {
    alvos.add(demanda.designer_id);
  }

  // Remove o próprio autor dos destinatários (ninguém é notificado da sua própria ação)
  if (autor) {
    if (autor.nome) alvos.delete(autor.nome.trim().toLowerCase());
    if (autor.email) alvos.delete(autor.email.trim().toLowerCase());
    if (autor.id) alvos.delete(autor.id);
  }

  return Array.from(alvos);
}

/**
 * Cria uma nova notificação no sistema
 */
export async function emitirNotificacao({
  demanda,
  autor,
  tipo = NOTIFICATION_TYPES.ALTERACAO,
  titulo,
  mensagem,
  link_path = '/',
  target_roles = [PERFIS.ADMIN], // Por padrão, administradores também recebem
  target_users = null,
}) {
  try {
    const autorNome = autor?.nome || 'Alguém';
    const autorEmail = autor?.email || '';
    const rawAvatar = autor?.avatar_url || '';
    // Evita salvar strings base64 pesadas no payload de notificações para não sobrecarregar o banco
    const autorAvatar = rawAvatar.startsWith('data:') || rawAvatar.length > 500 ? '' : rawAvatar;
    const autorId = autor?.id || '';

    // Se não especificado alvos customizados, calcula baseado na demanda
    const finalTargetUsers = target_users !== null
      ? target_users
      : calcularDestinatarios(demanda, autor);

    const payload = {
      demanda_id: demanda?.id || null,
      cliente_nome: demanda?.cliente || 'Demanda',
      actor_id: autorId,
      actor_name: autorNome,
      actor_email: autorEmail,
      actor_avatar: autorAvatar,
      tipo,
      titulo: titulo || `Atualização em ${demanda?.cliente || 'Demanda'}`,
      mensagem,
      target_users: finalTargetUsers,
      target_roles: target_roles || [],
      read_by: [], // IDs/emails dos usuários que já leram
      link_path,
      created_at: new Date().toISOString(),
    };

    const record = await localClient.entities.Notificacao.create(payload);

    // Disparar evento no window para atualização em tempo real na mesma aba
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-criada', { detail: record }));
    }

    return record;
  } catch (err) {
    console.error('[notificationService] Erro ao emitir notificação:', err);
    return null;
  }
}

/**
 * Verifica se uma notificação é direcionada ao usuário atual
 */
export function isNotificacaoParaUsuario(notificacao, usuario) {
  if (!usuario || !notificacao) return false;

  // Não notificar a si mesmo se foi o autor da ação
  const autorId = notificacao.actor_id ? String(notificacao.actor_id) : '';
  const autorEmail = (notificacao.actor_email || '').trim().toLowerCase();
  const autorNome = (notificacao.actor_name || '').trim().toLowerCase();

  const userId = usuario.id ? String(usuario.id) : '';
  const userEmail = (usuario.email || '').trim().toLowerCase();
  const userNome = (usuario.nome || '').trim().toLowerCase();

  const autorMatch =
    (autorId && userId && autorId === userId) ||
    (autorEmail && userEmail && autorEmail === userEmail) ||
    (autorNome && userNome && autorNome === userNome);

  if (autorMatch) return false;

  // Se o usuário tiver um perfil alvo (ex: admin)
  const targetRoles = parseArrayField(notificacao.target_roles);
  if (usuario.role && targetRoles.some((r) => String(r).toLowerCase() === usuario.role.toLowerCase())) {
    return true;
  }
  if (usuario.is_admin && (targetRoles.includes('admin') || targetRoles.includes(PERFIS.ADMIN))) {
    return true;
  }

  // Se o usuário estiver na lista de alvos (por nome, email ou id)
  const targets = parseArrayField(notificacao.target_users);
  return targets.some((t) => {
    const val = String(t).trim().toLowerCase();
    return (userNome && val === userNome) || (userEmail && val === userEmail) || (userId && val === userId.toLowerCase());
  });
}

/**
 * Verifica se a notificação já foi lida pelo usuário
 */
export function isNotificacaoLida(notificacao, usuario) {
  if (!usuario || !notificacao) return true;
  const readBy = parseArrayField(notificacao.read_by);
  const userEmail = (usuario.email || '').trim().toLowerCase();
  const userNome = (usuario.nome || '').trim().toLowerCase();
  const userId = usuario.id ? String(usuario.id).trim().toLowerCase() : '';

  return readBy.some((k) => {
    const val = String(k).trim().toLowerCase();
    return (userEmail && val === userEmail) || (userNome && val === userNome) || (userId && val === userId);
  });
}

/**
 * Marca uma notificação como lida para o usuário
 */
export async function marcarNotificacaoComoLida(notificacaoId, usuario) {
  if (!usuario || !notificacaoId) return;
  try {
    const notificacoes = await localClient.entities.Notificacao.list('-created_at', 500);
    const notif = (notificacoes || []).find((n) => n.id === notificacaoId);
    if (!notif) return;

    if (!isNotificacaoLida(notif, usuario)) {
      const readBy = parseArrayField(notif.read_by);
      const userKey = usuario.email || usuario.nome || usuario.id;
      readBy.push(userKey);
      await localClient.entities.Notificacao.update(notificacaoId, { read_by: readBy });
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
      }
    }
  } catch (err) {
    console.error('[notificationService] Erro ao marcar notificação como lida:', err);
  }
}

/**
 * Marca todas as notificações do usuário como lidas
 */
export async function marcarTodasNotificacoesComoLidas(usuario) {
  if (!usuario) return;
  try {
    const notificacoes = await localClient.entities.Notificacao.list('-created_at', 500);
    const userKey = usuario.email || usuario.nome || usuario.id;

    const updates = [];
    for (const notif of (notificacoes || [])) {
      if (isNotificacaoParaUsuario(notif, usuario) && !isNotificacaoLida(notif, usuario)) {
        const readBy = parseArrayField(notif.read_by);
        readBy.push(userKey);
        updates.push({ id: notif.id, read_by: readBy });
      }
    }

    if (updates.length > 0) {
      await Promise.all(
        updates.map((up) =>
          localClient.entities.Notificacao.update(up.id, { read_by: up.read_by }).catch((e) =>
            console.warn('[notificationService] Erro ao atualizar notificação:', e)
          )
        )
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
      }
    }
  } catch (err) {
    console.error('[notificationService] Erro ao marcar todas como lidas:', err);
  }
}

/**
 * Exclui uma única notificação por ID
 */
export async function excluirNotificacao(notificacaoId) {
  if (!notificacaoId) return;
  try {
    await localClient.entities.Notificacao.delete(notificacaoId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
    }
  } catch (err) {
    console.error('[notificationService] Erro ao excluir notificação:', err);
  }
}

/**
 * Remove todas as notificações direcionadas a este usuário
 */
export async function limparTodasNotificacoes(usuario) {
  if (!usuario) return;
  try {
    const notificacoes = await localClient.entities.Notificacao.list('-created_at', 500);
    const toDelete = (notificacoes || []).filter((n) => isNotificacaoParaUsuario(n, usuario));
    if (toDelete.length > 0) {
      await Promise.all(
        toDelete.map((n) =>
          localClient.entities.Notificacao.delete(n.id).catch((e) =>
            console.warn('[notificationService] Erro ao deletar notificação:', e)
          )
        )
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
      }
    }
  } catch (err) {
    console.error('[notificationService] Erro ao limpar todas as notificações:', err);
  }
}

/**
 * Remove notificações lidas antigas
 */
export async function limparNotificacoesLidas(usuario) {
  if (!usuario) return;
  try {
    const notificacoes = await localClient.entities.Notificacao.list('-created_at', 500);
    const toDelete = (notificacoes || []).filter(
      (n) => isNotificacaoParaUsuario(n, usuario) && isNotificacaoLida(n, usuario)
    );
    if (toDelete.length > 0) {
      await Promise.all(
        toDelete.map((n) =>
          localClient.entities.Notificacao.delete(n.id).catch((e) =>
            console.warn('[notificationService] Erro ao deletar notificação lida:', e)
          )
        )
      );
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
      }
    }
  } catch (err) {
    console.error('[notificationService] Erro ao limpar notificações lidas:', err);
  }
}
