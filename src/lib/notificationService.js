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
    const autorAvatar = autor?.avatar_url || '';
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

  // Não notificar a si mesmo
  const autorMatch =
    (notificacao.actor_id && notificacao.actor_id === usuario.id) ||
    (notificacao.actor_email && notificacao.actor_email.toLowerCase() === (usuario.email || '').toLowerCase()) ||
    (notificacao.actor_name && notificacao.actor_name.toLowerCase() === (usuario.nome || '').toLowerCase());

  if (autorMatch) return false;

  // Se o usuário tiver um perfil alvo (ex: admin)
  if (Array.isArray(notificacao.target_roles) && notificacao.target_roles.includes(usuario.role)) {
    return true;
  }

  // Se o usuário estiver na lista de usuários alvo (por nome, email ou id)
  const targets = Array.isArray(notificacao.target_users) ? notificacao.target_users : [];
  const userNome = (usuario.nome || '').trim().toLowerCase();
  const userEmail = (usuario.email || '').trim().toLowerCase();
  const userId = usuario.id;

  return targets.some((t) => {
    const val = String(t).toLowerCase();
    return val === userNome || val === userEmail || val === userId;
  });
}

/**
 * Verifica se a notificação já foi lida pelo usuário
 */
export function isNotificacaoLida(notificacao, usuario) {
  if (!usuario || !notificacao) return true;
  const readBy = Array.isArray(notificacao.read_by) ? notificacao.read_by : [];
  const userKey = usuario.email || usuario.nome || usuario.id;
  return readBy.some((k) => String(k).toLowerCase() === String(userKey).toLowerCase());
}

/**
 * Marca uma notificação como lida para o usuário
 */
export async function marcarNotificacaoComoLida(notificacaoId, usuario) {
  if (!usuario || !notificacaoId) return;
  try {
    const notificacoes = await localClient.entities.Notificacao.list('-created_at', 500);
    const notif = notificacoes.find((n) => n.id === notificacaoId);
    if (!notif) return;

    const readBy = Array.isArray(notif.read_by) ? [...notif.read_by] : [];
    const userKey = usuario.email || usuario.nome || usuario.id;

    if (!readBy.some((k) => String(k).toLowerCase() === String(userKey).toLowerCase())) {
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
    for (const notif of notificacoes) {
      if (isNotificacaoParaUsuario(notif, usuario) && !isNotificacaoLida(notif, usuario)) {
        const readBy = Array.isArray(notif.read_by) ? [...notif.read_by, userKey] : [userKey];
        updates.push({ id: notif.id, read_by: readBy });
      }
    }

    if (updates.length > 0) {
      await localClient.entities.Notificacao.bulkUpdate(updates);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
      }
    }
  } catch (err) {
    console.error('[notificationService] Erro ao marcar todas como lidas:', err);
  }
}

/**
 * Remove notificações lidas antigas
 */
export async function limparNotificacoesLidas(usuario) {
  if (!usuario) return;
  try {
    const notificacoes = await localClient.entities.Notificacao.list('-created_at', 500);
    for (const notif of notificacoes) {
      if (isNotificacaoParaUsuario(notif, usuario) && isNotificacaoLida(notif, usuario)) {
        await localClient.entities.Notificacao.delete(notif.id);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fluxo-clientes:notificacao-atualizada'));
    }
  } catch (err) {
    console.error('[notificationService] Erro ao limpar notificações lidas:', err);
  }
}
