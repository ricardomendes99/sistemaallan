// Session management
const Auth = (() => {
  const KEY = 'rdosys_session';

  function basePath() {
    return (location.pathname.includes('/admin/') || location.pathname.includes('/campo/')) ? '../' : '';
  }

  function login(email, senha) {
    const user = DB.getUserByEmail(email);
    if (!user)              return { ok: false, msg: 'Usuário não encontrado.' };
    if (!user.ativo)        return { ok: false, msg: 'Usuário inativo.' };
    if (user.senha_hash !== btoa(senha)) return { ok: false, msg: 'Senha incorreta.' };
    sessionStorage.setItem(KEY, JSON.stringify({ id: user.id, perfil: user.perfil }));
    return { ok: true, user };
  }

  function logout() {
    sessionStorage.removeItem(KEY);
    location.href = basePath() + 'index.html';
  }

  function session() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch { return null; }
  }

  function getCurrentUser() {
    const s = session();
    return s ? DB.getUserById(s.id) : null;
  }

  function requireAuth(role) {
    const s = session();
    if (!s) { location.href = basePath() + 'index.html'; return null; }
    if (role && s.perfil !== role) { alert('Acesso negado.'); history.back(); return null; }
    return DB.getUserById(s.id);
  }

  return { login, logout, getCurrentUser, requireAuth, basePath };
})();
