/**
 * CONFICOMPUTOS — Modelos (Programación Orientada a Objetos)
 * models.js
 *
 * Clases: Usuario · Producto · ItemCarrito · Pedido · RegistroGanancia · Notificacion
 */

'use strict';

/* ============================================================
   CLASE: Usuario
   ============================================================ */
class Usuario {
  /**
   * @param {number}  id
   * @param {string}  nombre
   * @param {string}  email
   * @param {string}  pass
   * @param {'admin'|'usuario'} rol
   * @param {boolean} activo
   * @param {string}  telefono
   * @param {string}  ciudad
   * @param {string}  registrado  - fecha ISO
   * @param {string}  [depto]
   * @param {string}  [fechaNac]
   */
  constructor(id, nombre, email, pass, rol, activo, telefono, ciudad, registrado, depto = '', fechaNac = '') {
    this.id          = id;
    this.nombre      = nombre;
    this.email       = email;
    this.pass        = pass;
    this.rol         = rol;
    this.activo      = activo;
    this.telefono    = telefono;
    this.ciudad      = ciudad;
    this.registrado  = registrado;
    this.depto       = depto;
    this.fechaNac    = fechaNac;
  }

  /** Primera letra del nombre (para el avatar) */
  get iniciales() { return this.nombre.charAt(0).toUpperCase(); }

  /** Etiqueta legible del rol */
  get rolLabel() { return this.rol === 'admin' ? 'Administrador' : 'Usuario'; }

  /** Alterna el estado activo/inactivo */
  toggleActivo() { this.activo = !this.activo; }

  /** Serializa el objeto para guardarlo en la BD */
  toJSON() {
    return {
      id: this.id, nombre: this.nombre, email: this.email,
      pass: this.pass, rol: this.rol, activo: this.activo,
      telefono: this.telefono, ciudad: this.ciudad,
      registrado: this.registrado, depto: this.depto, fechaNac: this.fechaNac
    };
  }

  /** Reconstruye un Usuario desde un objeto plano (BD) */
  static fromJSON(obj) {
    return new Usuario(
      obj.id, obj.nombre, obj.email, obj.pass, obj.rol,
      obj.activo, obj.telefono, obj.ciudad, obj.registrado,
      obj.depto || '', obj.fechaNac || ''
    );
  }
}

/* ============================================================
   CLASE: Producto
   ============================================================ */
class Producto {
  /**
   * @param {number} id
   * @param {string} nombre
   * @param {number} precio
   * @param {number} stock
   * @param {string} categoria
   * @param {string} emoji
   * @param {number} [vendidos]
   */
  constructor(id, nombre, precio, stock, categoria, emoji, vendidos = 0) {
    this.id        = id;
    this.nombre    = nombre;
    this.precio    = precio;
    this.stock     = stock;
    this.categoria = categoria;
    this.emoji     = emoji;
    this.vendidos  = vendidos;
  }

  /** Estado del stock: 'agotado' | 'bajo' | 'ok' */
  get estadoStock() {
    if (this.stock === 0)  return 'agotado';
    if (this.stock <= 3)   return 'bajo';
    return 'ok';
  }

  /** Clase CSS del badge de stock */
  get badgeClase() {
    return { agotado: 'badge-critical', bajo: 'badge-low', ok: 'badge-ok' }[this.estadoStock];
  }

  /** Texto del badge de stock */
  get badgeLabel() {
    if (this.stock === 0)  return 'Agotado';
    if (this.stock <= 3)   return `Bajo: ${this.stock}`;
    return `${this.stock} uds`;
  }

  /** Precio formateado en COP */
  get precioFmt() { return formatCOP(this.precio); }

  /** Descuenta stock y suma a vendidos */
  reducirStock(cantidad) {
    this.stock    = Math.max(0, this.stock - cantidad);
    this.vendidos += cantidad;
  }

  toJSON() {
    return { id:this.id, nombre:this.nombre, precio:this.precio, stock:this.stock, categoria:this.categoria, emoji:this.emoji, vendidos:this.vendidos };
  }

  static fromJSON(obj) {
    return new Producto(obj.id, obj.nombre, obj.precio, obj.stock, obj.categoria, obj.emoji, obj.vendidos || 0);
  }
}

/* ============================================================
   CLASE: ItemCarrito
   ============================================================ */
class ItemCarrito {
  /**
   * @param {Producto} producto
   * @param {number}   cantidad
   */
  constructor(producto, cantidad = 1) {
    this.producto = producto;
    this.cantidad = cantidad;
  }

  /** Subtotal del ítem */
  get subtotal() { return this.producto.precio * this.cantidad; }

  /** Subtotal formateado */
  get subtotalFmt() { return formatCOP(this.subtotal); }

  incrementar() { this.cantidad++; }
  decrementar() { if (this.cantidad > 1) this.cantidad--; }
}

/* ============================================================
   CLASE: Pedido
   ============================================================ */
class Pedido {
  /**
   * @param {number}   id
   * @param {Usuario}  usuario
   * @param {ItemCarrito[]} items
   * @param {'tarjeta'|'nequi'|'efectivo'} metodoPago
   * @param {number}   tiempoRecogida  minutos
   */
  constructor(id, usuario, items, metodoPago, tiempoRecogida = 20) {
    this.id             = id;
    this.usuario        = usuario;
    this.items          = items;
    this.metodoPago     = metodoPago;
    this.tiempoRecogida = tiempoRecogida;
    this.fecha          = new Date().toLocaleString('es-CO');
    this.estado         = 'pendiente'; // pendiente | listo | entregado
  }

  /** Total del pedido */
  get total() { return this.items.reduce((acc, i) => acc + i.subtotal, 0); }

  /** Total formateado */
  get totalFmt() { return formatCOP(this.total); }

  /** ID con formato #0001 */
  get idFmt() { return '#' + String(this.id).padStart(4, '0'); }

  /** Resumen de items en texto */
  get resumenItems() {
    return this.items.map(i => `${i.producto.emoji} ${i.producto.nombre} ×${i.cantidad}`).join(', ');
  }

  /** Etiqueta del método de pago */
  get metodoPagoLabel() {
    return { tarjeta: 'Tarjeta de crédito', nequi: 'Nequi', efectivo: 'Efectivo / Contraentrega' }[this.metodoPago] || this.metodoPago;
  }

  marcarListo()     { this.estado = 'listo';     }
  marcarEntregado() { this.estado = 'entregado'; }

  toJSON() {
    return {
      id: this.id, usuarioId: this.usuario.id, usuarioNombre: this.usuario.nombre,
      items: this.items.map(i => ({ productoId:i.producto.id, nombre:i.producto.nombre, emoji:i.producto.emoji, precio:i.producto.precio, cantidad:i.cantidad })),
      metodoPago: this.metodoPago, tiempoRecogida: this.tiempoRecogida,
      fecha: this.fecha, estado: this.estado, total: this.total
    };
  }
}

/* ============================================================
   CLASE: RegistroGanancia
   ============================================================ */
class RegistroGanancia {
  /**
   * @param {number} pedidoId
   * @param {number} total
   * @param {Date}   [fecha]
   */
  constructor(pedidoId, total, fecha = new Date()) {
    this.pedidoId = pedidoId;
    this.total    = total;
    this.fechaObj = fecha;
    this.fecha    = fecha.toLocaleString('es-CO');
    // Mes: "2025-05"
    this.mes = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    // Semana del año
    const jan1 = new Date(fecha.getFullYear(), 0, 1);
    const w    = Math.ceil(((fecha - jan1) / 86400000 + jan1.getDay() + 1) / 7);
    this.semana = `${fecha.getFullYear()}-S${String(w).padStart(2, '0')}`;
  }

  toJSON() {
    return { pedidoId:this.pedidoId, total:this.total, fecha:this.fecha, mes:this.mes, semana:this.semana };
  }
}

/* ============================================================
   CLASE: Notificacion
   ============================================================ */
class Notificacion {
  static _counter = 1;

  /**
   * @param {string} titulo
   * @param {string} mensaje
   * @param {'pedido'|'sms'|'alerta'} tipo
   */
  constructor(titulo, mensaje, tipo) {
    this.id     = Notificacion._counter++;
    this.titulo  = titulo;
    this.mensaje = mensaje;
    this.tipo    = tipo;
    this.fecha   = new Date().toLocaleString('es-CO');
    this.leida   = false;
  }

  marcarLeida() { this.leida = true; }

  toJSON() {
    return { id:this.id, titulo:this.titulo, mensaje:this.mensaje, tipo:this.tipo, fecha:this.fecha, leida:this.leida };
  }
}

/* ============================================================
   UTILIDAD GLOBAL
   ============================================================ */
function formatCOP(n) {
  return new Intl.NumberFormat('es-CO', { style:'currency', currency:'COP', minimumFractionDigits:0 }).format(n);
}
