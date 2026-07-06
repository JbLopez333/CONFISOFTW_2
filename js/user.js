  /**
   * CONFICOMPUTOS — Panel Usuario
   * user.js
   */
  'use strict';

  const UserApp = (() => {
    let currentUser = null;
    let currentSection = 'productos';
    let quantities = {};

    /* ── INIT ── */
    function init() {
      currentUser = AuthService.requerirSesion();
      if (!currentUser) return;
      document.getElementById('tb-user-name').textContent = currentUser.nombre;
      document.getElementById('tb-avatar').textContent    = currentUser.iniciales;
      UI.updateCartBadge();
      setupNav();
      renderSection('productos');
    }

    function setupNav() {
      document.querySelectorAll('.nav-link[data-section]').forEach(el => {
        el.addEventListener('click', () => renderSection(el.dataset.section));
      });
      document.getElementById('btn-logout')?.addEventListener('click', AuthService.logout);
      document.getElementById('btn-ir-carrito')?.addEventListener('click', () => renderSection('carrito'));
    }

    function closeMobileSidebar() {
      const offcanvasEl = document.getElementById('offcanvasSidebar');
      if (!offcanvasEl || !window.bootstrap) return;
      const instance = bootstrap.Offcanvas.getInstance(offcanvasEl);
      if (instance) instance.hide();
    }

    function renderSection(section) {
      currentSection = section;
      document.querySelectorAll('.nav-link[data-section]').forEach(el => {
        el.classList.toggle('active', el.dataset.section === section);
      });
      const content = document.getElementById('main-content');
      content.innerHTML = '';
      const map = {
        'productos': renderProductos,
        'carrito':   renderCarrito,
        'historial': renderHistorial,
        'perfil':    renderPerfil,
      };
      if (map[section]) map[section](content);
      closeMobileSidebar();
      UI.updateCartBadge();
    }

    /* ══════════════════════════════════════════════════════════
      SECCIÓN: PRODUCTOS
      ══════════════════════════════════════════════════════════ */
    async function renderProductos(c) {
      c.innerHTML = `
        <h2 class="page-title">Catálogo de Productos</h2>
        <p class="page-sub">Explora nuestros productos y arma tu pedido.</p>
        <div class="search-bar">
          <span>🔍</span>
          <input id="search-input" placeholder="Buscar por nombre o categoría..." />
          <span class="search-count" id="search-count">Cargando…</span>
        </div>
        <div class="products-grid" id="prod-grid"></div>`;

      await db.refrescarProductos();
      const prods = db.getProductos();
      document.getElementById('search-count').textContent = prods.length + ' productos';
      renderGrid(prods.slice(0, 20));

      document.getElementById('search-input').addEventListener('input', function () {
        const term = this.value.trim();
        const filtered = db.buscarProductos(term, 20);
        document.getElementById('search-count').textContent = filtered.length + ' productos';
        renderGrid(filtered);
      });
    }

    function renderGrid(prods) {
      const grid = document.getElementById('prod-grid');
      if (!grid) return;
      grid.innerHTML = prods.map(p => `
        <div class="product-card ${p.stock === 0 ? 'agotado' : ''}">
          <div class="pc-emoji">${p.emoji}</div>
          <div class="pc-cat">${p.categoria}</div>
          <div class="pc-name">${p.nombre}</div>
          <div class="pc-price">${p.precioFmt}</div>
          ${p.stock === 0
            ? '<span class="badge badge-critical" style="margin-top:4px">Agotado</span>'
            : `<div class="qty-ctrl">
                <button class="qty-btn" onclick="UserApp.changeQty(${p.id},-1)">−</button>
                <span class="qty-num" id="qty-${p.id}">${quantities[p.id] || 1}</span>
                <button class="qty-btn" onclick="UserApp.changeQty(${p.id},1)">+</button>
              </div>
              <button class="btn-add-cart" onclick="UserApp.addToCart(${p.id})">🛒 Agregar</button>`
          }
        </div>`).join('');
    }

    function changeQty(id, delta) {
      quantities[id] = Math.max(1, (quantities[id] || 1) + delta);
      const el = document.getElementById('qty-' + id);
      if (el) el.textContent = quantities[id];
    }

    function addToCart(id) {
      const prod = db.getProductos().find(p => p.id === id);
      if (!prod || prod.stock === 0) { UI.toast('⚠️ Producto agotado'); return; }
      const qty = quantities[id] || 1;
      StoreService.agregarAlCarrito(prod, qty);
      UI.updateCartBadge();
      UI.toast(`✅ ${prod.nombre} ×${qty} agregado al carrito`);
    }

    /* ══════════════════════════════════════════════════════════
      SECCIÓN: CARRITO
      ══════════════════════════════════════════════════════════ */
    function renderCarrito(c) {
      const items = StoreService.getCarrito();
      const total = StoreService.totalCarrito();

      c.innerHTML = `
        <h2 class="page-title">Mi Carrito</h2>
        <p class="page-sub">Revisa tu selección antes de pagar.</p>
        ${items.length === 0
          ? `<div class="card"><div class="empty-state">
              <div class="es-icon">🛒</div>
              <p>Tu carrito está vacío.<br>Explora nuestros productos.</p>
              <button class="btn btn-rosa" style="margin-top:16px" onclick="UserApp.goTo('productos')">Ver productos</button>
            </div></div>`
          : `<div class="card">
              ${items.map(i => `
                <div class="cart-item">
                  <div class="ci-emoji">${i.producto.emoji}</div>
                  <div class="ci-info">
                    <div class="ci-name">${i.producto.nombre}</div>
                    <div class="ci-sub">${i.cantidad} × ${i.producto.precioFmt}</div>
                  </div>
                  <strong style="color:var(--rosa-700)">${i.subtotalFmt}</strong>
                  <button class="ci-remove" onclick="UserApp.removeFromCart(${i.producto.id})">✕</button>
                </div>`).join('')}
              <div class="cart-total">Total: ${UI.fmt(total)}</div>
              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px">
                <button class="btn btn-outline" onclick="UserApp.vaciarCarrito()">🗑️ Vaciar</button>
                <button class="btn btn-rosa"    onclick="UserApp.abrirPasarela()">💳 Pagar ahora</button>
              </div>
            </div>`}

        <!-- PASARELA DE PAGO -->
        <div class="modal-overlay" id="modal-pasarela">
          <div class="modal-box" style="width:560px" onclick="event.stopPropagation()">
            <h3 class="modal-title">💳 Pasarela de Pago</h3>
            <div class="resumen-box" id="resumen-pasarela"></div>
            <div class="form-group">
              <label>⏱️ Tiempo de recogida en punto físico</label>
              <select id="pay-tiempo">
                <option value="10">Recoger en 10 minutos</option>
                <option value="15">Recoger en 15 minutos</option>
                <option value="20" selected>Recoger en 20 minutos</option>
                <option value="30">Recoger en 30 minutos</option>
              </select>
            </div>
            <div class="form-group">
              <label>Método de pago</label>
              <div class="metodo-tabs">
                <button class="metodo-tab active" data-metodo="efectivo" onclick="UserApp.setMetodo('efectivo')">💵 Efectivo</button>
              </div>
            </div>
            <div id="pay-efectivo-fields">
              <div class="info-box">📦 Paga al recoger en el punto físico. Tu pedido estará listo según el tiempo seleccionado.</div>
            </div>
            <div class="pay-error" id="pay-error"></div>
            <div class="modal-footer">
              <button class="btn btn-outline" onclick="UI.closeModal('modal-pasarela')">Cancelar</button>
              <button class="btn btn-rosa"    onclick="UserApp.procesarPago()">✅ Confirmar pago</button>
            </div>
          </div>
        </div>

        <!-- PAGO EXITOSO -->
        <div class="pago-exitoso-overlay" id="pago-exitoso">
          <div class="pex-circle">✓</div>
          <h2 class="pex-title">¡Pago exitoso!</h2>
          <p id="pex-pedido-id" style="font-size:15px;margin-bottom:6px"></p>
          <p style="font-size:13px;color:var(--gris-500);margin-bottom:6px">Confirmación enviada por SMS</p>
          <p id="pex-tiempo" style="font-size:14px;font-weight:600;color:var(--rosa-700);margin-bottom:24px"></p>
          <button class="btn btn-rosa btn-lg" onclick="UserApp.irAHistorial()">Ver mis pedidos →</button>
        </div>`;

      // Rellenar resumen
      llenarResumenPasarela();
    }

    function llenarResumenPasarela() {
      const box = document.getElementById('resumen-pasarela');
      if (!box) return;
      const items = StoreService.getCarrito();
      box.innerHTML = items.map(i =>
        `<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid var(--rosa-100)">
          <span>${i.producto.emoji} ${i.producto.nombre} ×${i.cantidad}</span>
          <span style="font-weight:600;color:var(--rosa-700)">${i.subtotalFmt}</span>
        </div>`).join('') +
        `<div style="font-size:18px;font-weight:700;color:var(--rosa-700);text-align:right;margin-top:10px">
          Total: ${UI.fmt(StoreService.totalCarrito())}
        </div>`;
    }

    function setMetodo(metodo) {
      document.querySelectorAll('.metodo-tab').forEach(t => t.classList.toggle('active', t.dataset.metodo === metodo));
    }

    function abrirPasarela() {
      llenarResumenPasarela();
      document.getElementById('pay-error').classList.remove('show');
      UI.openModal('modal-pasarela');
    }

    function procesarPago() {
      const metodo = document.querySelector('.metodo-tab.active')?.dataset.metodo || 'efectivo';
      const errEl  = document.getElementById('pay-error');
      errEl.classList.remove('show');

      const tiempo = parseInt(document.getElementById('pay-tiempo')?.value || '20');
      const pedido = StoreService.crearPedido(currentUser, metodo, tiempo);
      if (!pedido) { errEl.textContent = 'Error al procesar el pedido.'; errEl.classList.add('show'); return; }

      UI.closeModal('modal-pasarela');

      // SMS simulado
      UI.toast({ tel: currentUser.telefono || 'sin número', msg: `✅ ConfíSoftw: Tu pedido ${pedido.idFmt} por ${pedido.totalFmt} fue confirmado. Por favor recoger en punto físico en ${tiempo} minutos.` }, 'sms');

      // Pantalla éxito
      document.getElementById('pex-pedido-id').textContent = `Pedido ${pedido.idFmt} — ${pedido.totalFmt}`;
      document.getElementById('pex-tiempo').textContent    = `⏱️ Por favor recoger en ${tiempo} minutos en punto físico`;
      document.getElementById('pago-exitoso').classList.add('open');

      UI.updateCartBadge();
    }

    function removeFromCart(id) {
      StoreService.quitarDelCarrito(id);
      UI.updateCartBadge();
      renderSection('carrito');
    }

    function vaciarCarrito() {
      StoreService.vaciarCarrito();
      UI.updateCartBadge();
      renderSection('carrito');
    }

    function irAHistorial() {
      document.getElementById('pago-exitoso')?.classList.remove('open');
      renderSection('historial');
    }

    /* ══════════════════════════════════════════════════════════
      SECCIÓN: HISTORIAL
      ══════════════════════════════════════════════════════════ */
    function renderHistorial(c) {
      const pedidos = db.getPedidosDeUsuario(currentUser.id);

      c.innerHTML = `
        <h2 class="page-title">Mis Pedidos</h2>
        <p class="page-sub">Revisa todas tus compras anteriores.</p>
        ${pedidos.length === 0
          ? `<div class="card"><div class="empty-state">
              <div class="es-icon">📋</div>
              <p>No tienes pedidos aún.<br>¡Realiza tu primera compra!</p>
              <button class="btn btn-rosa" style="margin-top:16px" onclick="UserApp.goTo('productos')">Ver productos</button>
            </div></div>`
          : [...pedidos].reverse().map(p => `
            <div class="order-card">
              <div class="order-header">
                <div>
                  <div class="order-num">Pedido #${String(p.id).padStart(4,'0')}</div>
                  <div class="order-date">${p.fecha}</div>
                </div>
                <span class="badge badge-active">Completado</span>
              </div>
              <div class="tiempo-badge">⏱️ ${p.tiempoRecogida} min para recoger en punto físico</div>
              <div class="order-items-list" style="padding:10px 0;border-top:1px solid var(--gris-200);border-bottom:1px solid var(--gris-200);margin-bottom:12px">
                ${(p.items||[]).map(i => `<div style="font-size:13px;color:var(--gris-700);padding:3px 0">${i.emoji} ${i.nombre} × ${i.cantidad} — ${UI.fmt(i.precio*i.cantidad)}</div>`).join('')}
              </div>
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <span class="badge badge-purple">${{tarjeta:'Tarjeta',nequi:'Nequi',efectivo:'Efectivo'}[p.metodoPago]||p.metodoPago}</span>
                <div style="display:flex;align-items:center;gap:12px">
                  <strong style="color:var(--rosa-700);font-size:16px">${UI.fmt(p.total)}</strong>
                  <button class="btn btn-sm btn-outline" onclick="UserApp.descargarTicket(${p.id})">🎫 Ticket</button>
                </div>
              </div>
            </div>`).join('')}`;
    }

    function descargarTicket(pedidoId) {
      const p = db.getPedidos().find(x => x.id === pedidoId);
      if (!p) return;
      const idFmt = '#' + String(p.id).padStart(4,'0');
      const win = window.open('', '_blank');
      win.document.write(`<!DOCTYPE html><html><head><title>Ticket ${idFmt}</title>
      <style>
        body{font-family:'DM Sans',sans-serif;padding:30px;max-width:420px;margin:auto;color:#111}
        .header{background:linear-gradient(135deg,#ec4899,#be185d);color:#fff;padding:22px;border-radius:12px;text-align:center;margin-bottom:22px}
        .header h2{font-family:Georgia,serif;font-size:24px;margin:0}
        .header p{font-size:13px;margin:4px 0 0;opacity:.85}
        h3{color:#be185d;font-size:16px;margin-bottom:10px}
        .info{font-size:13px;margin-bottom:6px;color:#374151}
        hr{border:none;border-top:1px solid #fbcfe8;margin:14px 0}
        table{width:100%;font-size:13px;border-collapse:collapse}
        td{padding:5px 0}td:last-child{text-align:right;font-weight:600}
        .total{font-size:18px;font-weight:700;color:#be185d;text-align:right;margin-top:10px}
        .footer{text-align:center;color:#9ca3af;font-size:11px;margin-top:22px}
        .tiempo{display:inline-block;background:#fce7f3;border:1px solid #f9a8d4;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:600;color:#be185d;margin:8px 0}
      </style></head><body>
      <div class="header">
        <h2>ConfíSoftw</h2>
        <p>Sistema de Gestión Empresarial</p>
      </div>
      <h3>TICKET DE PEDIDO ${idFmt}</h3>
      <div class="info"><strong>Cliente:</strong> ${p.usuarioNombre||'—'}</div>
      <div class="info"><strong>Fecha:</strong> ${p.fecha}</div>
      <div class="info"><strong>Método:</strong> ${{tarjeta:'Tarjeta de crédito',nequi:'Nequi',efectivo:'Efectivo/Contraentrega'}[p.metodoPago]||p.metodoPago}</div>
      <div class="tiempo">⏱️ Recoger en ${p.tiempoRecogida} minutos — punto físico</div>
      <hr>
      <table>${(p.items||[]).map(i=>`<tr><td>${i.emoji} ${i.nombre} ×${i.cantidad}</td><td>${UI.fmt(i.precio*i.cantidad)}</td></tr>`).join('')}</table>
      <hr>
      <div class="total">Total: ${UI.fmt(p.total)}</div>
      <div class="footer">Gracias por tu compra — ConfíSoftw © ${new Date().getFullYear()}</div>
      </body></html>`);
      win.document.close();
      setTimeout(() => win.print(), 400);
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
            <button class="btn btn-rosa" id="btn-save-perfil">💾 Guardar cambios</button>
          </div>
        </div>`;

      document.getElementById('btn-save-perfil').onclick = () => {
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

    function goTo(section) { renderSection(section); }

    return { init, goTo, changeQty, addToCart, removeFromCart, vaciarCarrito, abrirPasarela, setMetodo, procesarPago, irAHistorial, descargarTicket };
  })();

  document.addEventListener('DOMContentLoaded', UserApp.init);