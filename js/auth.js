/**
 * CONFICOMPUTOS — Auth · Store · UI Utils
 * auth.js
 */

'use strict';

/* ============================================================
   AUTH SERVICE
   ============================================================ */
const AuthService = (() => {
  const SESSION_KEY   = 'cc_session';

  /** Inicia sesión. Devuelve el Usuario o null. */
 async function login(email, pass, rol) {

    const user = await db.findUsuario(
        email.trim(),
        pass.trim(),
        rol
    );

    if (!user) {
        return null;
    }

    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(user)
    );

    return user;

}

  /** Cierra sesión */
  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
    StoreService.vaciarCarrito();
    window.location.href = '../app.html';
  }

  /** Devuelve el usuario de sesión actual */
  function getUsuarioActual(){

    const data = sessionStorage.getItem(SESSION_KEY);

    if(!data){
        return null;
    }

    return JSON.parse(data);

}

  /** Registra un nuevo usuario */
  async function register(
    nombre,
    email,
    pass,
    rol,
    telefono,
    ciudad,
    depto,
    fechaNac
){

    const partes = nombre.trim().split(" ");

    const nombre1 = partes[0] || "";
    const apellido = partes.slice(1).join(" ");

    return await db.crearUsuario({

        nombre:nombre1,
        apellido:apellido,
        email:email,
        pass:pass,
        rol:rol,
        telefono:telefono,
        documento:""

    });

}

  /** Solicita recuperación — simula envío de email/SMS */
async function solicitarRecuperacion(email, metodo){

    const user=await db.findByEmail(email);

    if(!user){

        return null;

    }

    return{

        email:user.correo,
        telefono:user.telefono

    };

}

  /** Verifica si el token ingresado es válido */
  function verificarToken(email, token) {
    const tokens = JSON.parse(localStorage.getItem('cc_reset') || '{}');
    const entry  = tokens[email];
    if (!entry) return false;
    if (Date.now() > entry.exp) {
      delete tokens[email];
      localStorage.setItem('cc_reset', JSON.stringify(tokens));
      return false;
    }
    return entry.token === token.trim().toUpperCase();
  }

  /** Cambia la contraseña en la BD */
  async function cambiarPassword(email, nuevaPass) {

    const respuesta = await db.actualizarPass(email, nuevaPass);

    return respuesta.success;

}

  /** Guarda cambios del perfil */
  function actualizarPerfil(usuario) {
    db.actualizarUsuario(usuario);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(usuario.toJSON()));
  }

  /** Verifica que haya sesión, si no redirige al login */
  function requerirSesion() {
    const u = getUsuarioActual();
    if (!u) { window.location.href = '../app.html'; return null; }
    return u;
  }

  /** Verifica que el usuario sea admin */
  function requerirAdmin() {
    const u = requerirSesion();
    if (u && String(u.rol).toLowerCase() !== 'administrador') { window.location.href = 'user-dashboard.html'; return null; }
    return u;
  }

  return { login, logout, getUsuarioActual, register, actualizarPerfil, requerirSesion, requerirAdmin, solicitarRecuperacion, verificarToken, cambiarPassword };
})();


/* ============================================================
   STORE SERVICE (Estado global del carrito)
   ============================================================ */
const StoreService = (() => {
  const CART_KEY = 'cc_carrito';

  function getCarrito() {
    const data = JSON.parse(sessionStorage.getItem(CART_KEY) || '[]');
    // Reconstruir items con productos reales
    const productos = db.getProductos();
    return data.map(item => {
      const prod = productos.find(p => p.id === item.productoId);
      return prod ? new ItemCarrito(prod, item.cantidad) : null;
    }).filter(Boolean);
  }

  function _guardarCarrito(items) {
    sessionStorage.setItem(CART_KEY, JSON.stringify(
      items.map(i => ({ productoId: i.producto.id, cantidad: i.cantidad }))
    ));
  }

  function agregarAlCarrito(producto, cantidad = 1) {
    const items = getCarrito();
    const existing = items.find(i => i.producto.id === producto.id);
    if (existing) { existing.cantidad += cantidad; }
    else          { items.push(new ItemCarrito(producto, cantidad)); }
    _guardarCarrito(items);
  }

  function quitarDelCarrito(productoId) {
    const items = getCarrito().filter(i => i.producto.id !== productoId);
    _guardarCarrito(items);
  }

  function vaciarCarrito() {
    sessionStorage.removeItem(CART_KEY);
  }

  function totalCarrito() {
    return getCarrito().reduce((acc, i) => acc + i.subtotal, 0);
  }

  function cantidadCarrito() {
    return getCarrito().reduce((acc, i) => acc + i.cantidad, 0);
  }

  async function crearPedido(usuario, metodoPago, tiempoRecogida) {
    const items   = getCarrito();
    if (!items.length) return null;

    // id temporal en 0; se reemplaza por el id real que devuelve el servidor
    const pedido  = new Pedido(0, usuario, items, metodoPago, tiempoRecogida);

    const resultado = await db.guardarPedido(pedido);
    if (!resultado || !resultado.success) return null;
    pedido.id = resultado.id;

    // Registrar ganancia
    db.agregarGanancia(new RegistroGanancia(pedido.id, pedido.total));
    // Reducir stock
    for (const item of items) {
      item.producto.reducirStock(item.cantidad);
      await db.actualizarProducto(item.producto);
    }
    // Notificación al admin
    const notif = new Notificacion(
      `🛒 Nuevo pedido ${pedido.idFmt}`,
      `${usuario.nombre} realizó un pedido por ${pedido.totalFmt}. Recoger en ${tiempoRecogida} minutos en punto físico.`,
      'pedido'
    );
    db.agregarNotificacion(notif);
    // Vaciar carrito
    vaciarCarrito();
    return pedido;
  }

  return { getCarrito, agregarAlCarrito, quitarDelCarrito, vaciarCarrito, totalCarrito, cantidadCarrito, crearPedido };
})();


/* ============================================================
   UI UTILS
   ============================================================ */
const UI = (() => {

  /* ── Toast notifications ── */
  function toast(mensaje, tipo = 'normal') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    if (tipo === 'sms') {
      el.className = 'toast-sms';
      el.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4CAF50,#2e7d32);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📱</div>
          <div><div style="font-size:11px;color:#aaa;text-transform:uppercase">SMS enviado</div><div style="font-weight:600;font-size:13px;color:#fff">${mensaje.tel}</div></div>
          <button onclick="this.parentElement.parentElement.remove()" style="margin-left:auto;background:none;border:none;color:#aaa;cursor:pointer;font-size:18px">✕</button>
        </div>
        <div style="background:rgba(255,255,255,.1);border-radius:10px;padding:12px;font-size:12px;line-height:1.6;color:#e0e0e0">${mensaje.msg}</div>
        <div style="font-size:10px;color:#666;margin-top:8px;text-align:right">Ahora · Simulación SMS</div>`;
    } else if (tipo === 'alerta') {
      el.className = 'toast toast-alerta';
      el.textContent = '🔔 ' + mensaje;
    } else {
      el.className = 'toast';
      el.textContent = mensaje;
    }
    container.appendChild(el);
    const dur = tipo === 'sms' ? 6000 : 3000;
    setTimeout(() => el.remove(), dur);
  }

  /* ── Modal helpers ── */
  function openModal(id)  { document.getElementById(id).classList.add('open'); }
  function closeModal(id) { document.getElementById(id).classList.remove('open'); }
  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.open, .admin-code-overlay.open').forEach(m => m.classList.remove('open'));
  }

  /* ── Renderiza avatar ── */
  function avatar(iniciales, size = 36) {
    return `<div class="avatar" style="width:${size}px;height:${size}px;font-size:${Math.round(size*0.38)}px">${iniciales}</div>`;
  }

  /* ── Actualiza badge de carrito ── */
  function updateCartBadge() {
    const cnt  = StoreService.cantidadCarrito();
    const el   = document.getElementById('cart-badge');
    const navEl = document.getElementById('nav-badge-carrito');
    if (el)    { el.textContent = cnt; el.style.display = cnt > 0 ? 'flex' : 'none'; }
    if (navEl) { navEl.textContent = cnt; navEl.style.display = cnt > 0 ? 'flex' : 'none'; }
  }

  /* ── Actualiza badge de notificaciones ── */
  function updateNotifBadge() {
    const cnt = db.getNotificaciones().filter(n => !n.leida).length;
    const el  = document.getElementById('notif-badge');
    if (el) { el.textContent = cnt; el.style.display = cnt > 0 ? 'flex' : 'none'; }
  }

  /* ── Formato COP ── */
  function fmt(n) { return formatCOP(n); }

  /* ── Notificación pedido (admin en topbar) ── */
  function notifPedidoAdmin(pedido, usuario) {
    const existing = document.querySelector('.notif-pedido');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'notif-pedido';
    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--rosa-500),var(--rosa-700));display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🔔</div>
        <div><div style="font-weight:700;font-size:14px;color:var(--rosa-800)">¡Nuevo pedido!</div><div style="font-size:11px;color:var(--gris-400)">Ahora mismo</div></div>
        <button onclick="this.parentElement.parentElement.remove()" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:18px;color:var(--gris-400)">✕</button>
      </div>
      <div style="font-size:13px;color:var(--gris-700);line-height:1.6">
        <strong>${usuario.nombre}</strong> realizó el pedido <strong>${pedido.idFmt}</strong> por <strong>${pedido.totalFmt}</strong>.<br>
        ⏱️ Va a recoger en <strong>${pedido.tiempoRecogida} minutos</strong> en el punto físico.
      </div>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 8000);
  }

  return { toast, openModal, closeModal, closeAllModals, avatar, updateCartBadge, updateNotifBadge, fmt, notifPedidoAdmin };
})();

/* Cerrar modales al hacer click fuera */
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) UI.closeAllModals();
});
