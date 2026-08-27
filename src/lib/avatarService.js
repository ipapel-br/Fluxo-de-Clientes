// Serviço de gerenciamento de avatares com persistência e broadcast de atualizações
const STORAGE_KEY = 'fluxo-clientes:avatars';
const LISTENERS = new Set();
let USERS_CACHE = [];

function safeGetStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    }
  } catch {
    // Silencia erros de storage
  }
  return {};
}

function safeSetStorage(data) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  } catch {
    // Silencia erros de storage
  }
}

export function notifyAvatarUpdate() {
  LISTENERS.forEach((callback) => {
    try {
      callback();
    } catch {}
  });
}

export function syncAvatarsFromUsers(users = []) {
  if (!Array.isArray(users)) return;
  USERS_CACHE = users;
  const map = safeGetStorage();
  users.forEach((u) => {
    if (u && u.avatar_url) {
      if (u.nome) {
        map[String(u.nome).trim().toLowerCase()] = u.avatar_url;
        const primeiroNome = String(u.nome).trim().split(/\s+/)[0].toLowerCase();
        if (primeiroNome) map[primeiroNome] = u.avatar_url;
      }
      if (u.email) map[String(u.email).trim().toLowerCase()] = u.avatar_url;
      if (u.id) map[String(u.id).trim().toLowerCase()] = u.avatar_url;
    }
  });
  safeSetStorage(map);
  notifyAvatarUpdate();
}

export function getAvatar(name) {
  if (!name) return null;
  const key = String(name).trim().toLowerCase();

  // 1. Busca direta no cache de usuários cadastrados
  const foundUser = USERS_CACHE.find(
    (u) =>
      (u.nome && u.nome.trim().toLowerCase() === key) ||
      (u.email && u.email.trim().toLowerCase() === key) ||
      (u.id && u.id.trim().toLowerCase() === key)
  );
  if (foundUser?.avatar_url) return foundUser.avatar_url;

  // 2. Busca no storage local de avatares
  const map = safeGetStorage();
  if (map[key]) return map[key];

  // 3. Busca por primeiro nome (ex: card tem "Alan", usuário é "Alan Oliveira")
  const primeiroNome = key.split(/\s+/)[0];
  if (map[primeiroNome]) return map[primeiroNome];

  const partialUser = USERS_CACHE.find(
    (u) =>
      u.avatar_url &&
      u.nome &&
      (u.nome.toLowerCase().startsWith(primeiroNome) || primeiroNome.startsWith(u.nome.toLowerCase().split(/\s+/)[0]))
  );
  if (partialUser?.avatar_url) return partialUser.avatar_url;

  return null;
}

export function saveAvatar(name, dataUrl) {
  if (!name) return;
  const key = String(name).trim().toLowerCase();
  const map = safeGetStorage();
  if (dataUrl) {
    map[key] = dataUrl;
    const primeiroNome = key.split(/\s+/)[0];
    if (primeiroNome) map[primeiroNome] = dataUrl;
  } else {
    delete map[key];
  }
  safeSetStorage(map);
  notifyAvatarUpdate();
}

export function subscribeAvatars(callback) {
  LISTENERS.add(callback);
  return () => {
    LISTENERS.delete(callback);
  };
}

// Comprime imagem para avatar 128x128 em formato WebP/JPEG leve
export function processAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('O arquivo selecionado não é uma imagem válida.'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Calcula recorte quadrado centralizado
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/webp', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Erro ao processar a imagem.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });
}

// Cores determinísticas para iniciais
const AVATAR_COLORS = [
  { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }, // Red
  { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' }, // Amber
  { bg: '#dcfce7', text: '#166534', border: '#86efac' }, // Green
  { bg: '#e0f2fe', text: '#075985', border: '#7dd3fc' }, // Sky
  { bg: '#ede9fe', text: '#5b21b6', border: '#c4b5fd' }, // Purple
  { bg: '#fae8ff', text: '#86198f', border: '#f0abfc' }, // Fuchsia
  { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' }, // Orange
  { bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' }, // Slate
];

export function getAvatarColor(name) {
  if (!name) return AVATAR_COLORS[7];
  const str = typeof name === 'object' ? (name.nome || name.label || name.name || '') : String(name);
  if (!str) return AVATAR_COLORS[7];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function getInitials(name) {
  if (!name) return '?';
  const str = typeof name === 'object' ? (name.nome || name.label || name.name || '') : String(name);
  const trimmed = str.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
