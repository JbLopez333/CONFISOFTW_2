/**
 * CONFICOMPUTOS — Capa de Base de Datos
 * database.js
 *
 * Maneja LocalStorage como almacenamiento local.
 * Incluye ganchos para conectar a una API REST real.
 *
 * ─────────────────────────────────────────────────────────
 * PARA CONECTAR CON BASE DE DATOS REAL:
 *   1. Cambia DB_MODE a 'api'
 *   2. Define API_BASE_URL con tu servidor
 *   3. Cada método tiene su equivalente fetch() comentado
 * ─────────────────────────────────────────────────────────
 */

'use strict';

/* ── Configuración ── */
const DB_MODE = 'api';
const API_BASE_URL = '../api';

/* ============================================================
   CLASE: Database
   ============================================================ */
class Database {
  constructor() {
    this._keys = {
      usuarios:  'cc_usuarios',
      productos: 'cc_productos',
      pedidos:   'cc_pedidos',
      ganancias: 'cc_ganancias',
      notifs:    'cc_notificaciones',
    };
    this._inicializarDatosSemilla();
  }

 _inicializarDatosSemilla() {
    if (!localStorage.getItem(this._keys.usuarios)) {
      const usuarios = [
        new Usuario(1,'Administrador','admin@conficomputos.com','admin123','admin',true,'300 123 4567','Bogotá',new Date().toISOString().split('T')[0]),
        new Usuario(2,'Fernanda Barrera','fernanda@conficomputos.com','fernanda123','usuario',true,'311 987 6543','Medellín',new Date().toISOString().split('T')[0]),
        new Usuario(3,'Julian Lozano','julian@conficomputos.com','julian123','usuario',false,'320 456 7890','Cali',new Date().toISOString().split('T')[0]),
        new Usuario(4,'Jeremy Lopez','jeremy@conficomputos.com','jeremy123','usuario',true,'315 321 6547','Barranquilla',new Date().toISOString().split('T')[0]),
      ];
      this._guardar(this._keys.usuarios, usuarios.map(u => u.toJSON()));
    }
    
    if (!localStorage.getItem(this._keys.productos)) {
      const prods = [
        new Producto(1,'Laptop ProMax',2850000,15,'Tecnología','💻',42),
        new Producto(2,'Mouse Inalámbrico',85000,3,'Accesorios','🖱️',87),
        new Producto(3,'Teclado Mecánico',320000,0,'Accesorios','⌨️',33),
        new Producto(4,'Monitor 24"',980000,8,'Tecnología','🖥️',19),
        new Producto(5,'Auriculares BT',245000,2,'Audio','🎧',64),
        new Producto(6,'Webcam HD',185000,0,'Tecnología','📷',28),
        new Producto(7,'Silla Ergonómica',1250000,5,'Mobiliario','🪑',11),
        new Producto(8,'Tablet 10"',1450000,6,'Tecnología','📱',23),
        new Producto(9,'Impresora Laser',780000,4,'Impresión','🖨️',16),
        new Producto(10,'Hub USB-C',125000,12,'Accesorios','🔌',55),
        new Producto(11,'Cuaderno Universitario',8500,80,'Papelería','📓',210),
        new Producto(12,'Bolígrafos x12',12000,60,'Papelería','🖊️',175),
        new Producto(13,'Resma Papel A4',28000,40,'Papelería','📄',98),
        new Producto(14,'Carpeta Archivadora',18500,35,'Papelería','🗂️',64),
        new Producto(15,'Marcadores x6',15000,50,'Papelería','🖍️',130),
        new Producto(16,'Post-it Colores',9500,0,'Papelería','🗒️',88),
        new Producto(17,'Tijeras Profesionales',22000,25,'Papelería','✂️',41),
        new Producto(18,'Regla 30cm',4500,3,'Papelería','📏',56),
        new Producto(19,'Corrector Líquido',6800,45,'Papelería','🧴',93),
        new Producto(20,'Grapadora + Grapas',35000,18,'Papelería','📎',37),
      ];
      this._guardar(this._keys.productos, prods.map(p => p.toJSON()));
    }

    if (!localStorage.getItem(this._keys.ganancias)) {
      const gans = [
        { pedidoId:0, total:3250000, fecha:'15/01/2025', mes:'2025-01', semana:'2025-S03' },
        { pedidoId:0, total:980000,  fecha:'16/01/2025', mes:'2025-01', semana:'2025-S03' },
        { pedidoId:0, total:1750000, fecha:'20/01/2025', mes:'2025-01', semana:'2025-S04' },
        { pedidoId:0, total:4100000, fecha:'03/02/2025', mes:'2025-02', semana:'2025-S05' },
        { pedidoId:0, total:2300000, fecha:'10/02/2025', mes:'2025-02', semana:'2025-S06' },
        { pedidoId:0, total:5800000, fecha:'05/03/2025', mes:'2025-03', semana:'2025-S09' },
        { pedidoId:0, total:1200000, fecha:'12/03/2025', mes:'2025-03', semana:'2025-S10' },
        { pedidoId:0, total:3700000, fecha:'02/04/2025', mes:'2025-04', semana:'2025-S13' },
        { pedidoId:0, total:2900000, fecha:'15/04/2025', mes:'2025-04', semana:'2025-S15' },
        { pedidoId:0, total:4500000, fecha:'05/05/2025', mes:'2025-05', semana:'2025-S18' },
      ];
      this._guardar(this._keys.ganancias, gans);
    }
  }

  /* ── Helpers internos ── */
  _guardar(key, data)  { localStorage.setItem(key, JSON.stringify(data)); }
  _cargar(key)         { return JSON.parse(localStorage.getItem(key) || '[]'); }
  _nextId(lista)       { return lista.length ? Math.max(...lista.map(x => x.id)) + 1 : 1; }

  /* ══════════════════════════════════════════════════════════
     USUARIOS
     ══════════════════════════════════════════════════════════ */

  /** Obtiene todos los usuarios */
  getUsuarios() {
    // API: const r = await fetch(`${API_BASE_URL}/usuarios`); return (await r.json()).map(Usuario.fromJSON);
    return this._cargar(this._keys.usuarios).map(Usuario.fromJSON);
  }

  /** Busca un usuario por email + contraseña + rol */
 async findUsuario(email, pass, rol) {

    const datos = new FormData();

    datos.append("correo", email);
    datos.append("password", pass);
    datos.append("rol", rol);

    const respuesta = await fetch("../api/login.php",{
        method:"POST",
        body:datos
    });

    const json = await respuesta.json();

    if(json.success){

        return json.usuario;

    }

    return null;

}

  /** Crea un nuevo usuario */
async crearUsuario(usuario){

    const datos = new FormData();

    datos.append("nombre",usuario.nombre);
    datos.append("apellido",usuario.apellido);
    datos.append("correo",usuario.email);
    datos.append("password",usuario.pass);
    datos.append("telefono",usuario.telefono);
    datos.append("rol",usuario.rol);
    datos.append("documento",usuario.documento);

    const respuesta = await fetch("../api/registrar.php",{

        method:"POST",
        body:datos

    });

    return await respuesta.json();

}


  /** Busca usuario por email */
  async findByEmail(email){

    const datos=new FormData();

    datos.append("correo",email);

    const respuesta=await fetch("api/buscar_usuario.php",{

        method:"POST",
        body:datos

    });

    const json=await respuesta.json();

    if(json.success){

        return json.usuario;

    }

    return null;

}

  /** Actualiza solo la contraseña de un usuario */
async actualizarPass(email,nuevaPass){

    const datos=new FormData();

    datos.append("correo",email);
    datos.append("password",nuevaPass);

    const respuesta=await fetch("../api/cambiar_password.php",{

        method:"POST",
        body:datos

    });

    return await respuesta.json();

}

  /** Actualiza un usuario existente */
  actualizarUsuario(usuario) {
    // API: await fetch(`${API_BASE_URL}/usuarios/${usuario.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(usuario.toJSON()) });
    const lista = this._cargar(this._keys.usuarios);
    const idx   = lista.findIndex(u => u.id === usuario.id);
    if (idx !== -1) { lista[idx] = usuario.toJSON(); this._guardar(this._keys.usuarios, lista); }
  }

  /* ══════════════════════════════════════════════════════════
     PRODUCTOS
     ══════════════════════════════════════════════════════════ */

  /** Obtiene todos los productos */
  getProductos() {
    // API: const r = await fetch(`${API_BASE_URL}/productos`); return (await r.json()).map(Producto.fromJSON);
    return this._cargar(this._keys.productos).map(Producto.fromJSON);
  }

  /** Busca productos por texto */
  buscarProductos(term, limite = 20) {
    const t = term.toLowerCase();
    return this.getProductos()
      .filter(p => p.nombre.toLowerCase().includes(t) || p.categoria.toLowerCase().includes(t))
      .slice(0, limite);
  }

  /** Crea un producto */
  crearProducto(producto) {
    // API: const r = await fetch(`${API_BASE_URL}/productos`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(producto.toJSON()) });
    const lista = this._cargar(this._keys.productos);
    producto.id = this._nextId(lista);
    lista.push(producto.toJSON());
    this._guardar(this._keys.productos, lista);
    return producto;
  }

  /** Actualiza un producto */
  actualizarProducto(producto) {
    // API: await fetch(`${API_BASE_URL}/productos/${producto.id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(producto.toJSON()) });
    const lista = this._cargar(this._keys.productos);
    const idx   = lista.findIndex(p => p.id === producto.id);
    if (idx !== -1) { lista[idx] = producto.toJSON(); this._guardar(this._keys.productos, lista); }
  }

  /** Elimina un producto por ID */
  eliminarProducto(id) {
    // API: await fetch(`${API_BASE_URL}/productos/${id}`, { method:'DELETE' });
    const lista = this._cargar(this._keys.productos).filter(p => p.id !== id);
    this._guardar(this._keys.productos, lista);
  }

  /* ══════════════════════════════════════════════════════════
     PEDIDOS
     ══════════════════════════════════════════════════════════ */

  /** Obtiene todos los pedidos */
  getPedidos() {
    // API: const r = await fetch(`${API_BASE_URL}/pedidos`); return await r.json();
    return this._cargar(this._keys.pedidos);
  }

  /** Pedidos de un usuario específico */
  getPedidosDeUsuario(usuarioId) {
    return this.getPedidos().filter(p => p.usuarioId === usuarioId);
  }

  /** Guarda un pedido */
  guardarPedido(pedido) {
    // API: const r = await fetch(`${API_BASE_URL}/pedidos`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(pedido.toJSON()) });
    const lista = this._cargar(this._keys.pedidos);
    lista.unshift(pedido.toJSON());
    this._guardar(this._keys.pedidos, lista);
  }

  /** Actualiza estado de un pedido */
  actualizarEstadoPedido(pedidoId, estado) {
    // API: await fetch(`${API_BASE_URL}/pedidos/${pedidoId}/estado`, { method:'PATCH', body: JSON.stringify({estado}) });
    const lista = this._cargar(this._keys.pedidos);
    const idx   = lista.findIndex(p => p.id === pedidoId);
    if (idx !== -1) { lista[idx].estado = estado; this._guardar(this._keys.pedidos, lista); }
  }

  /* ══════════════════════════════════════════════════════════
     GANANCIAS
     ══════════════════════════════════════════════════════════ */

  getGanancias() {
    return this._cargar(this._keys.ganancias);
  }

  agregarGanancia(registro) {
    const lista = this._cargar(this._keys.ganancias);
    lista.unshift(registro.toJSON());
    this._guardar(this._keys.ganancias, lista);
  }

  gananciasPorMes() {
    const result = {};
    this.getGanancias().forEach(g => {
      if (!result[g.mes]) result[g.mes] = { mes:g.mes, total:0, count:0 };
      result[g.mes].total += g.total;
      result[g.mes].count++;
    });
    return Object.values(result).sort((a,b) => b.mes.localeCompare(a.mes));
  }

  gananciasPorSemana() {
    const result = {};
    this.getGanancias().forEach(g => {
      if (!result[g.semana]) result[g.semana] = { semana:g.semana, total:0, count:0 };
      result[g.semana].total += g.total;
      result[g.semana].count++;
    });
    return Object.values(result).sort((a,b) => b.semana.localeCompare(a.semana)).slice(0,8);
  }

  /* ══════════════════════════════════════════════════════════
     NOTIFICACIONES
     ══════════════════════════════════════════════════════════ */

  getNotificaciones() {
    return this._cargar(this._keys.notifs).map(n => Object.assign(new Notificacion('','','pedido'), n));
  }

  agregarNotificacion(notif) {
    const lista = this._cargar(this._keys.notifs);
    lista.unshift(notif.toJSON());
    this._guardar(this._keys.notifs, lista);
  }

  marcarTodasLeidas() {
    const lista = this._cargar(this._keys.notifs).map(n => ({ ...n, leida:true }));
    this._guardar(this._keys.notifs, lista);
  }
}

/* Instancia global única (Singleton) */
const db = new Database();
