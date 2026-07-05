/**
 * CONFICOMPUTOS — Panel Administrador
 * admin.js
 */
'use strict';

const AdminApp = (() => {
  let currentUser = null;
  let currentSection = 'productos';

  /* ── INIT ── */
  function init() {
    currentUser = AuthService.requerirAdmin();
    if (!currentUser) return;
    document.getElementById('tb-user-name').textContent = currentUser.nombre;
    document.getElementById('tb-avatar').textContent    = currentUser.iniciales;
    UI.updateNotifBadge();
    setupNav();
    renderSection('productos');
  }

  /* ── NAV ── */
  function setupNav() {
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      el.addEventListener('click', () => renderSection(el.dataset.section));
    });
    document.getElementById('btn-logout')?.addEventListener('click', AuthService.logout);
    document.getElementById('btn-menu-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  }

  function renderSection(section) {
    currentSection = section;
    document.querySelectorAll('.nav-item[data-section]').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    const content = document.getElementById('main-content');
    content.innerHTML = '';
    const map = {
      'productos':          renderProductos,
      'inventario':         renderInventario,
      'historial-inv':      renderHistorialInventario,
      'pedidos-admin':      renderPedidosAdmin,
      'pedidos-live':       renderPedidosLive,
      'usuarios':           renderUsuarios,
      'perfil':             renderPerfil,
    };
    if (map[section]) map[section](content);
    document.getElementById('sidebar').classList.remove('open');
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PRODUCTOS
     ══════════════════════════════════════════════════════════ */
  function renderProductos(c) {
    c.innerHTML = `
      <h2 class="page-title">Gestión de Productos</h2>
      <p class="page-sub">Administra el catálogo completo de la tienda.</p>
      ${AdminApp.renderExportBar('productos')}
      <div style="display:flex;justify-content:flex-end;margin-bottom:16px">
        <button class="btn btn-rosa" id="btn-nuevo-prod">+ Agregar Producto</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th></th><th>Nombre</th><th>Precio</th><th>Stock</th><th>Categoría</th><th>Vendidos</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-prod"></tbody>
        </table>
      </div>
      <!-- Modal producto -->
      <div class="modal-overlay" id="modal-prod">
        <div class="modal-box">
          <h3 class="modal-title" id="modal-prod-title">Nuevo Producto</h3>
          <div class="form-row">
            <div class="form-group"><label>Emoji</label><input id="p-emoji" maxlength="2" value="📦"></div>
            <div class="form-group"><label>Categoría</label><input id="p-cat" placeholder="Papelería, Tecnología..."></div>
          </div>
          <div class="form-group"><label>Nombre</label><input id="p-nombre" placeholder="Nombre del producto"></div>
          <div class="form-row">
            <div class="form-group"><label>Precio (COP)</label><input id="p-precio" type="number" min="0"></div>
            <div class="form-group"><label>Stock</label><input id="p-stock" type="number" min="0"></div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="UI.closeModal('modal-prod')">Cancelar</button>
            <button class="btn btn-rosa" id="btn-guardar-prod">Guardar</button>
          </div>
        </div>
      </div>`;
    refreshTablaProductos();
    document.getElementById('btn-nuevo-prod').onclick = () => abrirModalProducto(null);
  }

  function refreshTablaProductos() {
    const tbody = document.getElementById('tbody-prod');
    if (!tbody) return;
    tbody.innerHTML = db.getProductos().map(p => `
      <tr>
        <td style="font-size:22px">${p.emoji}</td>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.precioFmt}</td>
        <td><span class="badge ${p.badgeClase}">${p.badgeLabel}</span></td>
        <td>${p.categoria}</td>
        <td>${p.vendidos}</td>
        <td><div style="display:flex;gap:6px">
          <button class="btn btn-sm btn-outline" onclick="AdminApp.editarProducto(${p.id})">✏️</button>
          <button class="btn btn-sm btn-danger" onclick="AdminApp.eliminarProducto(${p.id})">🗑️</button>
        </div></td>
      </tr>`).join('');
  }

  function abrirModalProducto(id) {
    const p = id ? db.getProductos().find(x => x.id === id) : null;
    document.getElementById('modal-prod-title').textContent = id ? 'Editar Producto' : 'Nuevo Producto';
    document.getElementById('p-emoji').value  = p ? p.emoji : '📦';
    document.getElementById('p-nombre').value = p ? p.nombre : '';
    document.getElementById('p-precio').value = p ? p.precio : '';
    document.getElementById('p-stock').value  = p ? p.stock : '';
    document.getElementById('p-cat').value    = p ? p.categoria : '';
    document.getElementById('btn-guardar-prod').onclick = () => guardarProducto(id);
    UI.openModal('modal-prod');
  }

  function guardarProducto(id) {
    const nombre = document.getElementById('p-nombre').value.trim();
    if (!nombre) { UI.toast('⚠️ Ingresa un nombre'); return; }
    const prod = new Producto(
      id || 0,
      nombre,
      parseFloat(document.getElementById('p-precio').value) || 0,
      parseInt(document.getElementById('p-stock').value) || 0,
      document.getElementById('p-cat').value.trim(),
      document.getElementById('p-emoji').value || '📦'
    );
    if (id) { prod.id = id; db.actualizarProducto(prod); UI.toast('✅ Producto actualizado'); }
    else    { db.crearProducto(prod); UI.toast('✅ Producto agregado'); }
    UI.closeModal('modal-prod');
    refreshTablaProductos();
  }

  function editarProducto(id)   { abrirModalProducto(id); }
  function eliminarProducto(id) {
    if (!confirm('¿Eliminar este producto?')) return;
    db.eliminarProducto(id);
    refreshTablaProductos();
    UI.toast('🗑️ Producto eliminado');
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: INVENTARIO
     ══════════════════════════════════════════════════════════ */
  function renderInventario(c) {
    const prods    = db.getProductos();
    const gans     = db.getGanancias();
    const semanas  = db.gananciasPorSemana();
    const meses    = db.gananciasPorMes();
    const semTotal = semanas.length ? semanas[0].total : 0;
    const mesTotal = meses.length  ? meses[0].total   : 0;
    const agotados = prods.filter(p => p.stock === 0);
    const stockBajo= prods.filter(p => p.stock > 0 && p.stock <= 3);
    const masVend  = [...prods].sort((a,b) => b.vendidos - a.vendidos).slice(0,5);
    const maxVend  = masVend.length ? masVend[0].vendidos : 1;

    c.innerHTML = `
      <h2 class="page-title">Inventario & Finanzas</h2>
      <p class="page-sub">Resumen ejecutivo de rendimiento y stock.</p>
      ${AdminApp.renderExportBar('inventario')}
      <div class="stat-grid">
        <div class="stat-card"><div class="s-label">Ganancias Semana</div><div class="s-value">${UI.fmt(semTotal)}</div><div class="s-sub">Última semana</div></div>
        <div class="stat-card"><div class="s-label">Ganancias Mes</div><div class="s-value">${UI.fmt(mesTotal)}</div><div class="s-sub">Mes actual</div></div>
        <div class="stat-card"><div class="s-label">Agotados</div><div class="s-value" style="color:#dc2626">${agotados.length}</div><div class="s-sub">Stock = 0</div></div>
        <div class="stat-card"><div class="s-label">Stock Bajo</div><div class="s-value" style="color:#ea580c">${stockBajo.length}</div><div class="s-sub">≤ 3 unidades</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap">
        <div class="card">
          <div class="card-title">🏆 Más Vendidos</div>
          ${masVend.map(p => `<div class="bar-row"><div class="bar-label">${p.emoji} ${p.nombre}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(p.vendidos/maxVend*100)}%"></div></div><div class="bar-val">${p.vendidos}</div></div>`).join('')}
        </div>
        <div class="card">
          <div class="card-title">📦 Estado Stock</div>
          <div style="font-size:11px;font-weight:700;color:var(--gris-400);text-transform:uppercase;margin-bottom:8px">Agotados</div>
          ${agotados.length ? agotados.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gris-200)">${p.emoji} <span style="flex:1;font-size:13px">${p.nombre}</span><span class="badge badge-critical">Agotado</span></div>`).join('') : '<p style="font-size:13px;color:var(--gris-400)">✅ Sin agotados</p>'}
          <div style="font-size:11px;font-weight:700;color:var(--gris-400);text-transform:uppercase;margin:14px 0 8px">Stock Bajo (≤3)</div>
          ${stockBajo.length ? stockBajo.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--gris-200)">${p.emoji} <span style="flex:1;font-size:13px">${p.nombre}</span><span class="badge badge-low">${p.stock} uds</span></div>`).join('') : '<p style="font-size:13px;color:var(--gris-400)">✅ Stock saludable</p>'}
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: HISTORIAL INVENTARIO
     ══════════════════════════════════════════════════════════ */
  function renderHistorialInventario(c) {
    const meses   = db.gananciasPorMes();
    const semanas = db.gananciasPorSemana();
    const gans    = db.getGanancias();
    const total   = gans.reduce((a,g) => a+g.total, 0);
    const maxMes  = meses.length  ? Math.max(...meses.map(m=>m.total))  : 1;
    const maxSem  = semanas.length? Math.max(...semanas.map(s=>s.total)): 1;
    const mesNames= {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'};

    c.innerHTML = `
      <h2 class="page-title">Historial de Inventario</h2>
      <p class="page-sub">Registro histórico de ganancias por mes y semana.</p>
      ${AdminApp.renderExportBar('historial')}
      <div class="stat-grid">
        <div class="stat-card"><div class="s-label">Total Acumulado</div><div class="s-value" style="font-size:18px">${UI.fmt(total)}</div></div>
        <div class="stat-card"><div class="s-label">Transacciones</div><div class="s-value">${gans.length}</div></div>
        <div class="stat-card"><div class="s-label">Meses</div><div class="s-value">${meses.length}</div></div>
        <div class="stat-card"><div class="s-label">Promedio Mensual</div><div class="s-value" style="font-size:18px">${meses.length ? UI.fmt(Math.round(total/meses.length)) : '—'}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-title">📅 Ganancias por Mes</div>
          ${meses.map(m => { const [y,mo]=m.mes.split('-'); return `<div class="bar-row"><div class="bar-label">${mesNames[mo]||mo} ${y}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(m.total/maxMes*100)}%"></div></div><div class="bar-val">${UI.fmt(m.total)}</div></div>`; }).join('')}
        </div>
        <div class="card">
          <div class="card-title">📆 Ganancias por Semana</div>
          ${semanas.map(s => `<div class="bar-row"><div class="bar-label" style="width:80px">${s.semana}</div><div class="bar-track"><div class="bar-fill" style="width:${Math.round(s.total/maxSem*100)}%"></div></div><div class="bar-val">${UI.fmt(s.total)}</div></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-title">🧾 Detalle de Transacciones</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Fecha</th><th>Semana</th><th>Mes</th><th>Monto</th></tr></thead>
            <tbody>${gans.map((g,i) => `<tr><td>${gans.length-i}</td><td>${g.fecha}</td><td>${g.semana}</td><td>${g.mes}</td><td><strong style="color:var(--rosa-700)">${UI.fmt(g.total)}</strong></td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PEDIDOS ADMIN (historial todos)
     ══════════════════════════════════════════════════════════ */
  function renderPedidosAdmin(c) {
    const pedidos  = db.getPedidos();
    const totalRec = pedidos.reduce((a,p) => a+p.total, 0);
    c.innerHTML = `
      <h2 class="page-title">Pedidos de Clientes</h2>
      <p class="page-sub">Historial completo de todas las compras.</p>
      ${AdminApp.renderExportBar('pedidos')}
      <div class="stat-grid">
        <div class="stat-card"><div class="s-label">Total Pedidos</div><div class="s-value">${pedidos.length}</div></div>
        <div class="stat-card"><div class="s-label">Total Recaudado</div><div class="s-value" style="font-size:18px">${UI.fmt(totalRec)}</div></div>
        <div class="stat-card"><div class="s-label">Promedio Pedido</div><div class="s-value" style="font-size:18px">${pedidos.length ? UI.fmt(Math.round(totalRec/pedidos.length)) : '—'}</div></div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Método</th><th>Tiempo</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
          <tbody>
            ${pedidos.map(p => `
              <tr>
                <td><strong style="color:var(--rosa-700)">#${String(p.id).padStart(4,'0')}</strong></td>
                <td><div style="display:flex;align-items:center;gap:8px">${UI.avatar(p.usuarioNombre?.[0]||'?',28)}<span>${p.usuarioNombre||'—'}</span></div></td>
                <td style="font-size:12px;max-width:220px">${(p.items||[]).slice(0,2).map(i=>`${i.emoji} ${i.nombre} ×${i.cantidad}`).join(', ')}${(p.items||[]).length>2?` +${p.items.length-2} más`:''}</td>
                <td><span class="badge badge-purple" style="font-size:10px">${p.metodoPago||'—'}</span></td>
                <td>${p.tiempoRecogida} min</td>
                <td style="font-size:12px;color:var(--gris-400)">${p.fecha}</td>
                <td><strong style="color:var(--rosa-700)">${UI.fmt(p.total)}</strong></td>
                <td><span class="badge ${p.estado==='entregado'?'badge-active':p.estado==='listo'?'badge-blue':'badge-low'}">${p.estado||'pendiente'}</span></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PEDIDOS EN TIEMPO REAL
     ══════════════════════════════════════════════════════════ */
  function renderPedidosLive(c) {
    const notifs  = db.getNotificaciones();
    const pedidos = db.getPedidos().filter(p => p.estado !== 'entregado');
    UI.updateNotifBadge();

    c.innerHTML = `
      <h2 class="page-title">Pedidos en Tiempo Real</h2>
      <p class="page-sub">Alertas y estado actualizado de pedidos activos.</p>
      <div class="card" style="margin-bottom:24px">
        <div class="card-title" style="justify-content:space-between">
          <span>🔔 Notificaciones (${notifs.length})</span>
          <button class="btn btn-sm btn-outline" id="btn-marcar-leidas">Marcar todas leídas</button>
        </div>
        <div id="notifs-list">
          ${notifs.length === 0
            ? '<div class="empty-state" style="padding:20px"><div class="es-icon">🔔</div><p>Sin notificaciones aún.</p></div>'
            : notifs.map(n => `
              <div class="notif-row ${n.leida?'':'unread'}" onclick="AdminApp.marcarLeida(${n.id})">
                <div class="notif-dot ${n.leida?'':'unread'}"></div>
                <div class="notif-content">
                  <div class="notif-title-row"><span>${n.titulo}</span><span class="notif-time">${n.fecha}</span></div>
                  <p class="notif-msg">${n.mensaje}</p>
                </div>
              </div>`).join('')}
        </div>
      </div>
      <h3 style="font-size:18px;color:var(--rosa-800);margin-bottom:14px">📦 Pedidos Pendientes / Activos</h3>
      ${pedidos.length === 0
        ? '<div class="card"><div class="empty-state"><div class="es-icon">📦</div><p>No hay pedidos activos en este momento.</p></div></div>'
        : pedidos.map(p => `
          <div class="pedido-live-card" id="plc-${p.id}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
              <div><div style="font-size:18px;font-weight:700;color:var(--rosa-700);font-family:var(--font-display)">#${String(p.id).padStart(4,'0')}</div><div style="font-size:12px;color:var(--gris-400)">${p.fecha}</div></div>
              <span class="badge ${p.estado==='listo'?'badge-blue':'badge-low'}">${p.estado}</span>
            </div>
            <div class="pedido-usuario">
              ${UI.avatar(p.usuarioNombre?.[0]||'?', 32)}
              <div><div style="font-weight:600;font-size:14px">${p.usuarioNombre||'—'}</div></div>
            </div>
            <div class="pedido-items-list">
              ${(p.items||[]).map(i=>`<div class="pi-row"><span>${i.emoji} ${i.nombre} ×${i.cantidad}</span><span>${UI.fmt(i.precio*i.cantidad)}</span></div>`).join('')}
            </div>
            <div class="pedido-footer">
              <div>
                <div style="font-size:12px;color:var(--gris-400)">${{tarjeta:'Tarjeta de crédito',nequi:'Nequi',efectivo:'Efectivo'}[p.metodoPago]||p.metodoPago}</div>
                <div class="tiempo-badge">⏱️ Recoger en ${p.tiempoRecogida} minutos</div>
              </div>
              <div style="text-align:right">
                <div style="font-weight:700;color:var(--rosa-700);font-size:18px">${UI.fmt(p.total)}</div>
                <div style="display:flex;gap:6px;margin-top:8px;justify-content:flex-end">
                  ${p.estado==='pendiente' ? `<button class="btn btn-sm btn-outline" onclick="AdminApp.cambiarEstado(${p.id},'listo')">✅ Listo</button>` : ''}
                  ${p.estado==='listo'     ? `<button class="btn btn-sm btn-green"   onclick="AdminApp.cambiarEstado(${p.id},'entregado')">📦 Entregado</button>` : ''}
                </div>
              </div>
            </div>
          </div>`).join('')}`;

    document.getElementById('btn-marcar-leidas')?.addEventListener('click', () => {
      db.marcarTodasLeidas();
      UI.updateNotifBadge();
      renderPedidosLive(c);
    });
  }

  function marcarLeida(id) {
    const lista = db.getNotificaciones();
    const n = lista.find(x => x.id === id);
    if (n) { n.leida = true; db.marcarTodasLeidas(); }
  }

  function cambiarEstado(pedidoId, estado) {
    db.actualizarEstadoPedido(pedidoId, estado);
    UI.toast(estado === 'listo' ? '✅ Pedido marcado como listo' : '📦 Pedido entregado');
    renderSection('pedidos-live');
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: USUARIOS
     ══════════════════════════════════════════════════════════ */
  let usuariosCache = [];
  let rolesCache = [];

  async function cargarRoles() {
    if (rolesCache.length) return rolesCache;
    try {
      const resp = await fetch('../api/roles.php');
      rolesCache = await resp.json();
    } catch (e) {
      rolesCache = [];
    }
    return rolesCache;
  }

  async function renderUsuarios(c) {
    c.innerHTML = `
      <h2 class="page-title">Historial de Usuarios</h2>
      <p class="page-sub">Gestión y estado de todos los usuarios registrados.</p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Tel.</th><th>Registrado</th><th>Últ. inicio de sesión</th><th>Estado</th><th>Acciones</th></tr></thead>
          <tbody id="tbody-users"></tbody>
        </table>
      </div>
      <!-- Modal Editar Usuario -->
      <div class="modal-overlay" id="modal-edit-user">
        <div class="modal-box" style="max-width:480px">
          <h3 class="modal-title">✏️ Editar Usuario</h3>
          <div class="form-row">
            <div class="form-group"><label>Nombre</label><input id="eu-nombre" class="w-full"></div>
            <div class="form-group"><label>Apellido</label><input id="eu-apellido" class="w-full"></div>
          </div>
          <div class="form-group"><label>Correo electrónico</label><input id="eu-email" type="email"></div>
          <div class="form-group"><label>Teléfono</label><input id="eu-tel"></div>
          <div class="form-group">
            <label>Rol</label>
            <select id="eu-rol"></select>
          </div>
          <p style="font-size:12px;color:var(--gris-500);margin-top:4px">
            🔒 Solo un Administrador puede asignar el rol Administrador — el servidor también valida esto, aunque alguien intente saltarse esta pantalla.
          </p>
          <div class="modal-footer">
            <button class="btn btn-outline" onclick="document.getElementById('modal-edit-user').classList.remove('open')">Cancelar</button>
            <button class="btn btn-rosa" id="btn-save-user">💾 Guardar cambios</button>
          </div>
        </div>
      </div>`;

    const roles = await cargarRoles();
    const select = document.getElementById('eu-rol');
    if (select) {
      select.innerHTML = roles.map(r => `<option value="${r.id}">${r.nombre}</option>`).join('');
    }

    refreshTablaUsuarios();
  }

  async function refreshTablaUsuarios() {
    const tbody = document.getElementById('tbody-users');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px">Cargando usuarios…</td></tr>`;

    try {
      const resp = await fetch('../api/usuarios.php');
      usuariosCache = await resp.json();
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px">No se pudo cargar la lista de usuarios.</td></tr>`;
      return;
    }

    if (!Array.isArray(usuariosCache) || usuariosCache.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px">Aún no hay usuarios registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = usuariosCache.map(u => {
      const activo = Number(u.estado) === 1;
      const inicial = (u.nombre || '?').charAt(0).toUpperCase();
      const registrado = u.fecha_registro ? new Date(u.fecha_registro).toLocaleDateString('es-CO') : '—';
      const ultimoLogin = u.ultimo_login ? new Date(u.ultimo_login).toLocaleDateString('es-CO') : 'Nunca';
      return `
      <tr>
        <td><div style="display:flex;align-items:center;gap:8px">${UI.avatar(inicial, 30)}<strong>${u.nombre} ${u.apellido}</strong></div></td>
        <td style="font-size:13px">${u.correo}</td>
        <td><span class="badge badge-purple">${u.rol}</span></td>
        <td style="font-size:13px">${u.telefono || '—'}</td>
        <td>${registrado}</td>
        <td style="font-size:13px">${ultimoLogin}</td>
        <td><span class="badge ${activo ? 'badge-active' : 'badge-inactive'}">${activo ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <button class="btn btn-sm" style="background:var(--rosa-100);color:var(--rosa-700);border:1.5px solid var(--rosa-300)" onclick="AdminApp.editarUsuario(${u.id})">✏️ Editar</button>
            <button class="btn btn-sm btn-outline" onclick="AdminApp.toggleUsuario(${u.id})">${activo ? 'Desactivar' : 'Activar'}</button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  async function guardarUsuarioApi(payload) {
    try {
      const resp = await fetch('../api/usuarios.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, admin_id: currentUser.id })
      });
      const json = await resp.json();
      return json;
    } catch (e) {
      return { success: false };
    }
  }

  async function toggleUsuario(id) {
    const u = usuariosCache.find(x => Number(x.id) === Number(id));
    if (!u) return;
    const nuevoEstado = Number(u.estado) === 1 ? 0 : 1;
    const resultado = await guardarUsuarioApi({ ...u, estado: nuevoEstado });
    if (resultado.success) {
      UI.toast(nuevoEstado === 1 ? '✅ Usuario activado' : '❌ Usuario desactivado');
      refreshTablaUsuarios();
    } else {
      UI.toast('⚠️ ' + (resultado.mensaje || 'No se pudo actualizar el usuario'));
    }
  }

  function editarUsuario(id) {
    const u = usuariosCache.find(x => Number(x.id) === Number(id));
    if (!u) return;
    document.getElementById('eu-nombre').value   = u.nombre || '';
    document.getElementById('eu-apellido').value = u.apellido || '';
    document.getElementById('eu-email').value    = u.correo || '';
    document.getElementById('eu-tel').value      = u.telefono || '';
    const select = document.getElementById('eu-rol');
    if (select) select.value = String(u.rol_id);
    document.getElementById('btn-save-user').onclick = () => guardarEdicionUsuario(id);
    document.getElementById('modal-edit-user').classList.add('open');
  }

  async function guardarEdicionUsuario(id) {
    const u = usuariosCache.find(x => Number(x.id) === Number(id));
    if (!u) return;

    const payload = {
      ...u,
      nombre:   document.getElementById('eu-nombre').value.trim()   || u.nombre,
      apellido: document.getElementById('eu-apellido').value.trim() || u.apellido,
      correo:   document.getElementById('eu-email').value.trim()    || u.correo,
      telefono: document.getElementById('eu-tel').value.trim(),
      rol_id:   Number(document.getElementById('eu-rol').value)
    };

    const resultado = await guardarUsuarioApi(payload);
    document.getElementById('modal-edit-user').classList.remove('open');

    if (resultado.success) {
      UI.toast('✅ Usuario actualizado correctamente');
      refreshTablaUsuarios();
    } else {
      UI.toast('🚫 ' + (resultado.mensaje || 'No se pudo actualizar el usuario'));
    }
  }

  /* ══════════════════════════════════════════════════════════
     SECCIÓN: PERFIL
     ══════════════════════════════════════════════════════════ */
  function renderPerfil(c) {
    const u = currentUser;
    c.innerHTML = `
      <h2 class="page-title">Mi Perfil</h2>
      <p class="page-sub">Administra tu información personal.</p>
      <div class="card" style="max-width:480px;margin:0 auto">
        <div class="profile-avatar">${u.iniciales}</div>
        <div class="profile-name">${u.nombre}</div>
        <div style="text-align:center;margin-bottom:24px"><span class="badge badge-purple">${u.rolLabel}</span></div>
        <div class="form-group"><label>Nombre completo</label><input id="pf-nombre" value="${u.nombre}"></div>
        <div class="form-group"><label>Correo electrónico</label><input id="pf-email" type="email" value="${u.email}"></div>
        <div class="form-group"><label>Teléfono</label><input id="pf-tel" value="${u.telefono||''}"></div>
        <div class="form-group"><label>Ciudad</label><input id="pf-ciudad" value="${u.ciudad||''}"></div>
        <div class="form-group"><label>Nueva contraseña</label><input id="pf-pass" type="password" placeholder="Dejar vacío para no cambiar"></div>
        <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button class="btn btn-rosa" id="btn-guardar-perfil">💾 Guardar cambios</button>
        </div>
      </div>`;
    document.getElementById('btn-guardar-perfil').onclick = () => {
      currentUser.nombre   = document.getElementById('pf-nombre').value || currentUser.nombre;
      currentUser.email    = document.getElementById('pf-email').value  || currentUser.email;
      currentUser.telefono = document.getElementById('pf-tel').value;
      currentUser.ciudad   = document.getElementById('pf-ciudad').value;
      const np = document.getElementById('pf-pass').value;
      if (np) currentUser.pass = np;
      AuthService.actualizarPerfil(currentUser);
      document.getElementById('tb-user-name').textContent = currentUser.nombre;
      document.getElementById('tb-avatar').textContent    = currentUser.iniciales;
      UI.toast('✅ Perfil actualizado');
    };
  }


  /* ══════════════════════════════════════════════════════════
     EXPORTACIONES — PDF · EXCEL · WORD
     ══════════════════════════════════════════════════════════ */

  /* ── Helpers compartidos ── */
  function _fmtCOP(n) {
    return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n||0);
  }
  function _fecha() { return new Date().toLocaleString('es-CO'); }
  function _hoy()   { return new Date().toLocaleDateString('es-CO'); }

  /* ══ 1. EXPORTAR PDF ══════════════════════════════════════ */
  function exportarPDF(seccion) {
    const win  = window.open('', '_blank');
    const prods = db.getProductos();
    const peds  = db.getPedidos();
    const gans  = db.getGanancias();
    const sems  = db.gananciasPorSemana();
    const meses = db.gananciasPorMes();
    const totalAcum = gans.reduce((a,g)=>a+g.total,0);
    const agotados  = prods.filter(p=>p.stock===0);
    const stockBajo = prods.filter(p=>p.stock>0&&p.stock<=3);
    const masVend   = [...prods].sort((a,b)=>b.vendidos-a.vendidos).slice(0,5);
    const mesNom    = {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'};

    const estilos = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'DM Sans',sans-serif;color:#111;padding:32px;font-size:13px}
        .hdr{background:linear-gradient(135deg,#ec4899,#9d174d);color:#fff;padding:22px 28px;border-radius:12px;margin-bottom:24px}
        .hdr h1{font-size:22px;margin-bottom:4px}.hdr p{font-size:12px;opacity:.85}
        .logo-row{display:flex;align-items:center;gap:14px}
        .logo-circle{width:50px;height:50px;border-radius:50%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;flex-shrink:0}
        h2{font-size:16px;color:#be185d;margin:22px 0 10px;border-bottom:2px solid #fbcfe8;padding-bottom:6px}
        h3{font-size:14px;color:#9d174d;margin:14px 0 8px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
        th{background:#fce7f3;color:#9d174d;padding:8px 10px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
        td{padding:8px 10px;border-bottom:1px solid #f9a8d4}
        tr:nth-child(even) td{background:#fdf2f8}
        .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
        .stat-box{background:#fdf2f8;border:1px solid #fbcfe8;border-radius:10px;padding:14px;text-align:center}
        .stat-box .sv{font-size:20px;font-weight:700;color:#be185d}.stat-box .sl{font-size:11px;color:#6b7280;margin-top:2px}
        .badge-ok{background:#dcfce7;color:#166534;padding:2px 8px;border-radius:20px;font-size:11px}
        .badge-low{background:#fff7ed;color:#c2410c;padding:2px 8px;border-radius:20px;font-size:11px}
        .badge-crit{background:#fef2f2;color:#b91c1c;padding:2px 8px;border-radius:20px;font-size:11px}
        .badge-purple{background:#f3e8ff;color:#7e22ce;padding:2px 8px;border-radius:20px;font-size:11px}
        footer{margin-top:32px;padding-top:14px;border-top:1px solid #fbcfe8;font-size:11px;color:#9ca3af;text-align:center}
        @media print{body{padding:16px}.hdr{border-radius:0}}
      </style>`;

    let body = '';

    if (seccion === 'productos' || seccion === 'completo') {
      body += `<h2>📦 Catálogo de Productos</h2>
      <table><thead><tr><th>Emoji</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Vendidos</th><th>Estado</th></tr></thead><tbody>
        ${prods.map(p=>`<tr>
          <td>${p.emoji}</td><td><strong>${p.nombre}</strong></td><td>${p.categoria}</td>
          <td>${_fmtCOP(p.precio)}</td><td>${p.stock}</td><td>${p.vendidos}</td>
          <td>${p.stock===0?'<span class="badge-crit">Agotado</span>':p.stock<=3?'<span class="badge-low">Stock bajo</span>':'<span class="badge-ok">Disponible</span>'}</td>
        </tr>`).join('')}
      </tbody></table>`;
    }

    if (seccion === 'inventario' || seccion === 'completo') {
      body += `<h2>📊 Resumen de Inventario</h2>
      <div class="stat-grid">
        <div class="stat-box"><div class="sv">${_fmtCOP(sems.length?sems[0].total:0)}</div><div class="sl">Ganancias semana</div></div>
        <div class="stat-box"><div class="sv">${_fmtCOP(meses.length?meses[0].total:0)}</div><div class="sl">Ganancias mes</div></div>
        <div class="stat-box"><div class="sv" style="color:#dc2626">${agotados.length}</div><div class="sl">Productos agotados</div></div>
        <div class="stat-box"><div class="sv" style="color:#ea580c">${stockBajo.length}</div><div class="sl">Stock bajo (≤3)</div></div>
      </div>
      <h3>🏆 Top 5 Más Vendidos</h3>
      <table><thead><tr><th>Producto</th><th>Categoría</th><th>Vendidos</th><th>Ingreso Estimado</th></tr></thead><tbody>
        ${masVend.map(p=>`<tr><td>${p.emoji} ${p.nombre}</td><td>${p.categoria}</td><td>${p.vendidos}</td><td>${_fmtCOP(p.precio*p.vendidos)}</td></tr>`).join('')}
      </tbody></table>
      <h3>📦 Productos Agotados</h3>
      ${agotados.length
        ? `<table><thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>Vendidos totales</th></tr></thead><tbody>${agotados.map(p=>`<tr><td>${p.emoji} ${p.nombre}</td><td>${p.categoria}</td><td>${_fmtCOP(p.precio)}</td><td>${p.vendidos}</td></tr>`).join('')}</tbody></table>`
        : '<p style="color:#16a34a;font-size:13px">✅ No hay productos agotados.</p>'}`;
    }

    if (seccion === 'historial' || seccion === 'completo') {
      body += `<h2>📈 Historial Financiero</h2>
      <div class="stat-grid">
        <div class="stat-box"><div class="sv">${_fmtCOP(totalAcum)}</div><div class="sl">Total acumulado</div></div>
        <div class="stat-box"><div class="sv">${gans.length}</div><div class="sl">Transacciones</div></div>
        <div class="stat-box"><div class="sv">${meses.length}</div><div class="sl">Meses registrados</div></div>
        <div class="stat-box"><div class="sv">${meses.length?_fmtCOP(Math.round(totalAcum/meses.length)):'—'}</div><div class="sl">Promedio mensual</div></div>
      </div>
      <h3>📅 Ganancias por Mes</h3>
      <table><thead><tr><th>Mes</th><th>Total</th><th>Transacciones</th></tr></thead><tbody>
        ${meses.map(m=>{const[y,mo]=m.mes.split('-');return`<tr><td>${mesNom[mo]||mo} ${y}</td><td>${_fmtCOP(m.total)}</td><td>${m.count}</td></tr>`;}).join('')}
      </tbody></table>
      <h3>🧾 Detalle de Transacciones</h3>
      <table><thead><tr><th>#</th><th>Fecha</th><th>Semana</th><th>Mes</th><th>Monto</th></tr></thead><tbody>
        ${gans.map((g,i)=>`<tr><td>${i+1}</td><td>${g.fecha}</td><td>${g.semana}</td><td>${g.mes}</td><td>${_fmtCOP(g.total)}</td></tr>`).join('')}
      </tbody></table>`;
    }

    if (seccion === 'pedidos' || seccion === 'completo') {
      const totalRec = peds.reduce((a,p)=>a+p.total,0);
      body += `<h2>🧾 Historial de Pedidos</h2>
      <div class="stat-grid">
        <div class="stat-box"><div class="sv">${peds.length}</div><div class="sl">Total pedidos</div></div>
        <div class="stat-box"><div class="sv">${_fmtCOP(totalRec)}</div><div class="sl">Total recaudado</div></div>
        <div class="stat-box"><div class="sv">${peds.length?_fmtCOP(Math.round(totalRec/peds.length)):'—'}</div><div class="sl">Promedio pedido</div></div>
        <div class="stat-box"><div class="sv">${peds.filter(p=>p.estado==='entregado').length}</div><div class="sl">Entregados</div></div>
      </div>
      <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Método</th><th>Tiempo</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead><tbody>
        ${peds.map(p=>`<tr>
          <td><strong>#${String(p.id).padStart(4,'0')}</strong></td>
          <td>${p.usuarioNombre||'—'}</td>
          <td style="font-size:11px">${(p.items||[]).map(i=>`${i.emoji}${i.nombre}×${i.cantidad}`).join(', ')}</td>
          <td><span class="badge-purple">${{tarjeta:'Tarjeta',nequi:'Nequi',efectivo:'Efectivo'}[p.metodoPago]||'—'}</span></td>
          <td>${p.tiempoRecogida} min</td>
          <td><span class="${p.estado==='entregado'?'badge-ok':p.estado==='listo'?'badge-purple':'badge-low'}">${p.estado||'—'}</span></td>
          <td>${_fmtCOP(p.total)}</td>
          <td style="font-size:11px">${p.fecha}</td>
        </tr>`).join('')}
      </tbody></table>`;
    }

    const titulos = {
      productos:'Catálogo de Productos', inventario:'Inventario & Finanzas',
      historial:'Historial Financiero', pedidos:'Historial de Pedidos', completo:'Informe Completo'
    };

    win.document.write(`<!DOCTYPE html><html><head><title>${titulos[seccion]||'Informe'}</title>${estilos}</head><body>
      <div class="hdr">
        <div class="logo-row">
          <div class="logo-circle">C</div>
          <div><h1>ConfíComputos — ${titulos[seccion]||'Informe'}</h1><p>Generado: ${_fecha()} · Sistema de Gestión Empresarial</p></div>
        </div>
      </div>
      ${body}
      <footer>ConfíComputos © ${new Date().getFullYear()} — Documento generado automáticamente el ${_hoy()}</footer>
    </body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  /* ══ 2. EXPORTAR EXCEL ════════════════════════════════════ */
  function exportarExcel(seccion) {
    const prods = db.getProductos();
    const peds  = db.getPedidos();
    const gans  = db.getGanancias();
    const sems  = db.gananciasPorSemana();
    const meses = db.gananciasPorMes();
    const mesNom = {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'};

    // Construye HTML que Excel puede abrir como hoja de cálculo
    let sheetsHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">
    <style>
      body{font-family:Calibri,Arial,sans-serif;font-size:11pt}
      table{border-collapse:collapse;width:100%}
      th{background:#ec4899;color:#fff;padding:6px 10px;text-align:left;font-weight:700;border:1px solid #be185d}
      td{padding:5px 10px;border:1px solid #fbcfe8}
      tr:nth-child(even) td{background:#fdf2f8}
      .hdr-row td{background:#9d174d;color:#fff;font-size:14pt;font-weight:700;padding:10px}
      .sub-row td{background:#fce7f3;color:#be185d;font-size:11pt;font-weight:700;padding:6px 10px}
      .total-row td{background:#fce7f3;font-weight:700;color:#9d174d}
      .sep td{height:18px}
    </style></head><body>`;

    sheetsHtml += `<table>
      <tr class="hdr-row"><td colspan="8">ConfíComputos — Informe de Gestión · ${_fecha()}</td></tr>
      <tr class="sep"><td colspan="8"></td></tr>`;

    if (seccion === 'productos' || seccion === 'completo') {
      const totalStock  = prods.reduce((a,p)=>a+p.stock,0);
      const totalVend   = prods.reduce((a,p)=>a+p.vendidos,0);
      const valorInv    = prods.reduce((a,p)=>a+p.precio*p.stock,0);
      sheetsHtml += `
      <tr class="sub-row"><td colspan="8">📦 CATÁLOGO DE PRODUCTOS</td></tr>
      <tr><th>Emoji</th><th>Nombre</th><th>Categoría</th><th>Precio COP</th><th>Stock actual</th><th>Vendidos</th><th>Ingreso estimado</th><th>Estado</th></tr>
      ${prods.map(p=>`<tr>
        <td>${p.emoji}</td><td>${p.nombre}</td><td>${p.categoria}</td>
        <td>${_fmtCOP(p.precio)}</td><td>${p.stock}</td><td>${p.vendidos}</td>
        <td>${_fmtCOP(p.precio*p.vendidos)}</td>
        <td>${p.stock===0?'Agotado':p.stock<=3?'Stock bajo':'Disponible'}</td>
      </tr>`).join('')}
      <tr class="total-row"><td colspan="3">TOTALES</td><td>—</td><td>${totalStock} uds</td><td>${totalVend}</td><td>${_fmtCOP(valorInv)}</td><td>—</td></tr>
      <tr class="sep"><td colspan="8"></td></tr>`;
    }

    if (seccion === 'inventario' || seccion === 'completo') {
      const masVend = [...prods].sort((a,b)=>b.vendidos-a.vendidos).slice(0,5);
      sheetsHtml += `
      <tr class="sub-row"><td colspan="5">📊 TOP 5 PRODUCTOS MÁS VENDIDOS</td></tr>
      <tr><th>Posición</th><th>Producto</th><th>Categoría</th><th>Vendidos</th><th>Ingreso estimado</th></tr>
      ${masVend.map((p,i)=>`<tr><td>${i+1}</td><td>${p.emoji} ${p.nombre}</td><td>${p.categoria}</td><td>${p.vendidos}</td><td>${_fmtCOP(p.precio*p.vendidos)}</td></tr>`).join('')}
      <tr class="sep"><td colspan="5"></td></tr>`;
    }

    if (seccion === 'historial' || seccion === 'completo') {
      const totalAcum = gans.reduce((a,g)=>a+g.total,0);
      sheetsHtml += `
      <tr class="sub-row"><td colspan="4">📅 GANANCIAS POR MES</td></tr>
      <tr><th>Mes</th><th>Año</th><th>Total COP</th><th>Transacciones</th></tr>
      ${meses.map(m=>{const[y,mo]=m.mes.split('-');return`<tr><td>${mesNom[mo]||mo}</td><td>${y}</td><td>${_fmtCOP(m.total)}</td><td>${m.count}</td></tr>`;}).join('')}
      <tr class="total-row"><td colspan="2">TOTAL ACUMULADO</td><td>${_fmtCOP(totalAcum)}</td><td>${gans.length}</td></tr>
      <tr class="sep"><td colspan="4"></td></tr>
      <tr class="sub-row"><td colspan="5">📆 GANANCIAS POR SEMANA</td></tr>
      <tr><th>Semana</th><th>Total COP</th><th>Transacciones</th></tr>
      ${sems.map(s=>`<tr><td>${s.semana}</td><td>${_fmtCOP(s.total)}</td><td>${s.count}</td></tr>`).join('')}
      <tr class="sep"><td colspan="5"></td></tr>
      <tr class="sub-row"><td colspan="5">🧾 DETALLE DE TRANSACCIONES</td></tr>
      <tr><th>#</th><th>Fecha</th><th>Semana</th><th>Mes</th><th>Monto COP</th></tr>
      ${gans.map((g,i)=>`<tr><td>${i+1}</td><td>${g.fecha}</td><td>${g.semana}</td><td>${g.mes}</td><td>${_fmtCOP(g.total)}</td></tr>`).join('')}
      <tr class="sep"><td colspan="5"></td></tr>`;
    }

    if (seccion === 'pedidos' || seccion === 'completo') {
      const peds  = db.getPedidos();
      const totalR = peds.reduce((a,p)=>a+p.total,0);
      sheetsHtml += `
      <tr class="sub-row"><td colspan="8">🧾 HISTORIAL DE PEDIDOS</td></tr>
      <tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Método</th><th>Tiempo (min)</th><th>Estado</th><th>Total COP</th><th>Fecha</th></tr>
      ${peds.map(p=>`<tr>
        <td>#${String(p.id).padStart(4,'0')}</td>
        <td>${p.usuarioNombre||'—'}</td>
        <td>${(p.items||[]).map(i=>`${i.nombre} x${i.cantidad}`).join(' | ')}</td>
        <td>${{tarjeta:'Tarjeta',nequi:'Nequi',efectivo:'Efectivo'}[p.metodoPago]||'—'}</td>
        <td>${p.tiempoRecogida}</td>
        <td>${p.estado||'—'}</td>
        <td>${_fmtCOP(p.total)}</td>
        <td>${p.fecha}</td>
      </tr>`).join('')}
      <tr class="total-row"><td colspan="6">TOTAL RECAUDADO</td><td>${_fmtCOP(totalR)}</td><td>—</td></tr>`;
    }

    sheetsHtml += `</table></body></html>`;

    const blob = new Blob(['\ufeff' + sheetsHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const nombres = { productos:'productos', inventario:'inventario', historial:'historial-financiero', pedidos:'pedidos', completo:'informe-completo' };
    a.href     = url;
    a.download = `conficomputos-${nombres[seccion]||seccion}-${_hoy().replace(/\//g,'-')}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast('✅ Excel descargado correctamente');
  }

  /* ══ 3. EXPORTAR WORD ════════════════════════════════════ */
  function exportarWord(seccion) {
    const prods = db.getProductos();
    const peds  = db.getPedidos();
    const gans  = db.getGanancias();
    const sems  = db.gananciasPorSemana();
    const meses = db.gananciasPorMes();
    const totalAcum  = gans.reduce((a,g)=>a+g.total,0);
    const totalPeds  = peds.reduce((a,p)=>a+p.total,0);
    const mesNom     = {'01':'Enero','02':'Febrero','03':'Marzo','04':'Abril','05':'Mayo','06':'Junio','07':'Julio','08':'Agosto','09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre'};

    const estilos = `
      body{font-family:Calibri,Arial,sans-serif;margin:3cm 2.5cm;font-size:11pt;line-height:1.5;color:#111}
      h1{font-size:20pt;color:#9d174d;border-bottom:3px solid #ec4899;padding-bottom:8pt;margin-bottom:6pt}
      h2{font-size:15pt;color:#be185d;margin:20pt 0 8pt;border-left:4pt solid #ec4899;padding-left:10pt}
      h3{font-size:12pt;color:#9d174d;margin:12pt 0 6pt}
      p{margin:0 0 8pt}
      table{border-collapse:collapse;width:100%;margin-bottom:14pt;font-size:10pt}
      th{background:#ec4899;color:#fff;padding:7pt 9pt;text-align:left;font-weight:700;border:1pt solid #be185d}
      td{padding:6pt 9pt;border:1pt solid #f9a8d4}
      tr:nth-child(even) td{background:#fdf2f8}
      .kpi-table td{border:none;padding:8pt 14pt;background:#fdf2f8;text-align:center}
      .kpi-num{font-size:18pt;font-weight:700;color:#be185d;display:block}
      .kpi-lbl{font-size:9pt;color:#6b7280}
      .total-row td{background:#fce7f3;font-weight:700;color:#9d174d}
      .cover{text-align:center;margin-bottom:40pt;padding:24pt;background:#fdf2f8;border-radius:8pt;border:2pt solid #fbcfe8}
      .cover h1{border:none;font-size:26pt}.cover .sub{color:#6b7280;font-size:12pt}
      .cover .fecha{color:#be185d;font-size:11pt;margin-top:8pt}`;

    let body = `
      <div class="cover">
        <h1>📊 ConfíComputos</h1>
        <p class="sub">Sistema de Gestión Empresarial</p>
        <p style="font-size:18pt;font-weight:700;color:#9d174d;margin:8pt 0">Informe de ${seccion==='completo'?'Gestión Completo':seccion.charAt(0).toUpperCase()+seccion.slice(1)}</p>
        <p class="fecha">Generado: ${_fecha()}</p>
      </div>
      <p><strong>Propósito:</strong> Este documento presenta el reporte detallado de ${seccion==='completo'?'todos los módulos del sistema':seccion} de ConfíComputos, generado automáticamente desde el sistema de gestión empresarial.</p>
      <p><strong>Responsable:</strong> Administrador del sistema &nbsp;|&nbsp; <strong>Fecha:</strong> ${_hoy()}</p>`;

    if (seccion === 'productos' || seccion === 'completo') {
      body += `<h2>📦 Catálogo de Productos</h2>
      <p>Total de productos registrados: <strong>${prods.length}</strong></p>
      <table><thead><tr><th>Emoji</th><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Stock</th><th>Vendidos</th><th>Estado</th></tr></thead><tbody>
        ${prods.map(p=>`<tr><td>${p.emoji}</td><td>${p.nombre}</td><td>${p.categoria}</td><td>${_fmtCOP(p.precio)}</td><td>${p.stock}</td><td>${p.vendidos}</td><td>${p.stock===0?'Agotado':p.stock<=3?'Stock bajo':'Disponible'}</td></tr>`).join('')}
        <tr class="total-row"><td colspan="4">Totales</td><td>${prods.reduce((a,p)=>a+p.stock,0)} uds</td><td>${prods.reduce((a,p)=>a+p.vendidos,0)}</td><td>—</td></tr>
      </tbody></table>`;
    }

    if (seccion === 'inventario' || seccion === 'completo') {
      const masVend = [...prods].sort((a,b)=>b.vendidos-a.vendidos).slice(0,5);
      body += `<h2>📊 Análisis de Inventario</h2>
      <table class="kpi-table"><tr>
        <td><span class="kpi-num">${_fmtCOP(sems.length?sems[0].total:0)}</span><span class="kpi-lbl">Ganancias semana</span></td>
        <td><span class="kpi-num">${_fmtCOP(meses.length?meses[0].total:0)}</span><span class="kpi-lbl">Ganancias mes</span></td>
        <td><span class="kpi-num" style="color:#dc2626">${prods.filter(p=>p.stock===0).length}</span><span class="kpi-lbl">Agotados</span></td>
        <td><span class="kpi-num" style="color:#ea580c">${prods.filter(p=>p.stock>0&&p.stock<=3).length}</span><span class="kpi-lbl">Stock bajo</span></td>
      </tr></table>
      <h3>🏆 Top 5 Más Vendidos</h3>
      <table><thead><tr><th>#</th><th>Producto</th><th>Categoría</th><th>Vendidos</th><th>Ingreso</th></tr></thead><tbody>
        ${masVend.map((p,i)=>`<tr><td>${i+1}</td><td>${p.emoji} ${p.nombre}</td><td>${p.categoria}</td><td>${p.vendidos}</td><td>${_fmtCOP(p.precio*p.vendidos)}</td></tr>`).join('')}
      </tbody></table>`;
    }

    if (seccion === 'historial' || seccion === 'completo') {
      body += `<h2>📈 Historial Financiero</h2>
      <p>Total acumulado: <strong>${_fmtCOP(totalAcum)}</strong> en <strong>${gans.length}</strong> transacciones durante <strong>${meses.length}</strong> meses.</p>
      <h3>📅 Ganancias por Mes</h3>
      <table><thead><tr><th>Mes</th><th>Año</th><th>Total</th><th>Transacciones</th></tr></thead><tbody>
        ${meses.map(m=>{const[y,mo]=m.mes.split('-');return`<tr><td>${mesNom[mo]||mo}</td><td>${y}</td><td>${_fmtCOP(m.total)}</td><td>${m.count}</td></tr>`;}).join('')}
        <tr class="total-row"><td colspan="2">Total</td><td>${_fmtCOP(totalAcum)}</td><td>${gans.length}</td></tr>
      </tbody></table>
      <h3>📆 Ganancias por Semana</h3>
      <table><thead><tr><th>Semana</th><th>Total</th><th>Transacciones</th></tr></thead><tbody>
        ${sems.map(s=>`<tr><td>${s.semana}</td><td>${_fmtCOP(s.total)}</td><td>${s.count}</td></tr>`).join('')}
      </tbody></table>`;
    }

    if (seccion === 'pedidos' || seccion === 'completo') {
      body += `<h2>🧾 Historial de Pedidos</h2>
      <p>Total de pedidos: <strong>${peds.length}</strong> · Total recaudado: <strong>${_fmtCOP(totalPeds)}</strong></p>
      <table><thead><tr><th>Pedido</th><th>Cliente</th><th>Productos</th><th>Método</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead><tbody>
        ${peds.map(p=>`<tr>
          <td>#${String(p.id).padStart(4,'0')}</td><td>${p.usuarioNombre||'—'}</td>
          <td style="font-size:9pt">${(p.items||[]).map(i=>`${i.nombre} ×${i.cantidad}`).join(', ')}</td>
          <td>${{tarjeta:'Tarjeta',nequi:'Nequi',efectivo:'Efectivo'}[p.metodoPago]||'—'}</td>
          <td>${p.estado||'—'}</td><td>${_fmtCOP(p.total)}</td><td style="font-size:9pt">${p.fecha}</td>
        </tr>`).join('')}
        <tr class="total-row"><td colspan="5">Total recaudado</td><td>${_fmtCOP(totalPeds)}</td><td>—</td></tr>
      </tbody></table>`;
    }

    const htmlWord = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><style>${estilos}</style></head><body>${body}</body></html>`;

    const blob = new Blob(['\ufeff' + htmlWord], { type: 'application/msword;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const noms = { productos:'productos', inventario:'inventario', historial:'historial-financiero', pedidos:'pedidos', completo:'informe-completo' };
    a.href     = url;
    a.download = `conficomputos-${noms[seccion]||seccion}-${_hoy().replace(/\//g,'-')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast('✅ Word descargado correctamente');
  }

  /* ══ UI: Panel de exportaciones por sección ══ */
  function renderExportBar(seccion) {
    return `
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px;padding:14px 16px;background:#fdf2f8;border:1.5px solid #fbcfe8;border-radius:12px;align-items:center">
        <span style="font-size:13px;font-weight:600;color:#9d174d;margin-right:4px">📥 Descargar:</span>
        <button class="btn btn-sm" style="background:#dc2626;color:#fff;gap:4px" onclick="AdminApp.exportarPDF('${seccion}')">📄 PDF</button>
        <button class="btn btn-sm" style="background:#16a34a;color:#fff;gap:4px" onclick="AdminApp.exportarExcel('${seccion}')">📊 Excel</button>
        <button class="btn btn-sm" style="background:#1d4ed8;color:#fff;gap:4px" onclick="AdminApp.exportarWord('${seccion}')">📝 Word</button>
        ${seccion !== 'completo' ? `<button class="btn btn-sm btn-outline" onclick="AdminApp.exportarPDF('completo')">📋 Informe completo PDF</button><button class="btn btn-sm btn-outline" onclick="AdminApp.exportarExcel('completo')">📋 Informe completo Excel</button>` : ''}
      </div>`;
  }

  return { init, renderSection, editarProducto, eliminarProducto, toggleUsuario, editarUsuario, marcarLeida, cambiarEstado, exportarPDF, exportarExcel, exportarWord, renderExportBar };
})();

document.addEventListener('DOMContentLoaded', AdminApp.init);