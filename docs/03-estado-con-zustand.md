# 03 — Estado Global con Zustand

> **Proyecto Flex** · Stack: Next.js · Supabase · Zustand · Stripe  
> Nivel: Principiante-Intermedio

---

## ¿Por qué Zustand y no Context API o Redux?

| Herramienta   | Ventaja                        | Inconveniente                         |
|---------------|--------------------------------|---------------------------------------|
| Context API   | Nativa de React, sin instalar  | Re-render de todo el árbol al cambiar |
| Redux Toolkit | Muy potente, DevTools          | Boilerplate, curva de aprendizaje     |
| **Zustand**   | Mínimo boilerplate, rápido     | Menos ecosistema que Redux            |

Para Flex necesitamos:

- **Carrito de consumiciones** (añadir bebidas/comida desde el menú)
- **Selección de sala VIP** (qué sala, qué franja horaria)
- Sincronización de UI sin recargar la página

Zustand resuelve todo esto con muy poco código y sin contextos anidados.

---

## Instalación

```bash
npm install zustand
```

---

## Estructura de stores

Creamos dos stores separados. Cada store es responsable de **una sola cosa** (principio de responsabilidad única):

```
store/
  carritoStore.js    ← consumiciones (bebidas, comida)
  reservaStore.js    ← selección de sala VIP + franja horaria
```

---

## 1. `carritoStore.js`

```js
// store/carritoStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Store del carrito de consumiciones.
 *
 * Usamos el middleware 'persist' para guardar el carrito en localStorage.
 * Si el usuario recarga la página o cierra el navegador accidentalmente,
 * no pierde lo que había añadido.
 *
 * Estructura de cada item:
 * {
 *   id: number,         ← id del producto en la DB
 *   nombre: string,
 *   precio: number,
 *   imagen_url: string,
 *   cantidad: number
 * }
 */
export const useCarritoStore = create(
  persist(
    (set, get) => ({
      // ─── Estado ───────────────────────────────────────────────────
      items: [],       // array de productos en el carrito
      mesaId: null,    // mesa donde está sentado el cliente

      // ─── Acciones ─────────────────────────────────────────────────

      /**
       * Establece la mesa del cliente (se llama al escanear el QR de la mesa).
       */
      setMesa(mesaId) {
        set({ mesaId })
      },

      /**
       * Añade un producto. Si ya existe, incrementa la cantidad.
       */
      agregarItem(producto) {
        set((estado) => {
          const existente = estado.items.find((i) => i.id === producto.id)

          if (existente) {
            // Mapea el array: solo cambia el item que coincide
            return {
              items: estado.items.map((i) =>
                i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
              ),
            }
          }

          // Producto nuevo: lo añadimos con cantidad 1
          return { items: [...estado.items, { ...producto, cantidad: 1 }] }
        })
      },

      /**
       * Reduce la cantidad. Si llega a 0, elimina el item del carrito.
       */
      quitarItem(productoId) {
        set((estado) => ({
          items: estado.items
            .map((i) =>
              i.id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i
            )
            .filter((i) => i.cantidad > 0),  // eliminar si cantidad = 0
        }))
      },

      /**
       * Elimina un producto del carrito independientemente de la cantidad.
       */
      eliminarItem(productoId) {
        set((estado) => ({
          items: estado.items.filter((i) => i.id !== productoId),
        }))
      },

      /**
       * Vacía el carrito. Se llama tras confirmar el pedido.
       */
      vaciarCarrito() {
        set({ items: [], mesaId: null })
      },

      // ─── Derivados (calculados) ────────────────────────────────────

      /**
       * Número total de unidades en el carrito (suma de cantidades).
       * Útil para el badge del icono del carrito.
       */
      get totalUnidades() {
        return get().items.reduce((acc, i) => acc + i.cantidad, 0)
      },

      /**
       * Precio total del carrito.
       */
      get totalPrecio() {
        return get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
      },
    }),
    {
      name: 'flex-carrito',  // clave en localStorage
      // Solo persistimos 'items' y 'mesaId', no las funciones
      partialize: (estado) => ({ items: estado.items, mesaId: estado.mesaId }),
    }
  )
)
```

---

## 2. `reservaStore.js`

```js
// store/reservaStore.js
import { create } from 'zustand'

/**
 * Store para la selección de sala VIP.
 * NO persistimos esto en localStorage porque es un flujo de pago activo;
 * si el usuario recarga, debe empezar desde el principio (evita estados corruptos).
 */
export const useReservaStore = create((set, get) => ({
  // ─── Estado ─────────────────────────────────────────────────────
  salaSeleccionada: null,  // objeto sala completo (id, nombre, precio_hora…)
  fechaInicio: null,       // Date | null
  fechaFin: null,          // Date | null
  paso: 1,                 // 1: elegir sala | 2: elegir horario | 3: confirmar pago

  // ─── Acciones ───────────────────────────────────────────────────

  seleccionarSala(sala) {
    set({ salaSeleccionada: sala, paso: 2 })
  },

  seleccionarHorario(inicio, fin) {
    set({ fechaInicio: inicio, fechaFin: fin, paso: 3 })
  },

  /**
   * Vuelve al paso anterior.
   */
  retroceder() {
    set((estado) => ({ paso: Math.max(1, estado.paso - 1) }))
  },

  /**
   * Limpia la selección. Se llama si el usuario cancela el flujo
   * o cuando el pago se completa.
   */
  resetReserva() {
    set({
      salaSeleccionada: null,
      fechaInicio: null,
      fechaFin: null,
      paso: 1,
    })
  },

  // ─── Derivados ──────────────────────────────────────────────────

  /**
   * Calcula el precio total basándose en precio_hora y las horas seleccionadas.
   * Devuelve 0 si no hay sala o fechas seleccionadas.
   */
  get totalReserva() {
    const { salaSeleccionada, fechaInicio, fechaFin } = get()
    if (!salaSeleccionada || !fechaInicio || !fechaFin) return 0

    const horas = (fechaFin - fechaInicio) / (1000 * 60 * 60)  // ms → horas
    return Math.max(0, horas * salaSeleccionada.precio_hora)
  },
}))
```

---

## 3. Uso en componentes React

### 3.1 Botón "Añadir al carrito"

```jsx
// components/TarjetaProducto.jsx
'use client'

import { useCarritoStore } from '@/store/carritoStore'

export default function TarjetaProducto({ producto }) {
  // Solo nos suscribimos a la acción, no al array completo.
  // Así el componente NO re-renderiza cuando cambia el carrito de otro producto.
  const agregarItem = useCarritoStore((estado) => estado.agregarItem)

  return (
    <div className="tarjeta-producto">
      <img src={producto.imagen_url} alt={producto.nombre} />
      <h3>{producto.nombre}</h3>
      <p>{producto.precio} €</p>
      <button onClick={() => agregarItem(producto)}>
        + Añadir
      </button>
    </div>
  )
}
```

### 3.2 Icono del carrito con badge

```jsx
// components/IconoCarrito.jsx
'use client'

import { useCarritoStore } from '@/store/carritoStore'

export default function IconoCarrito() {
  // Suscripción selectiva: solo re-renderiza cuando cambia totalUnidades
  const totalUnidades = useCarritoStore((estado) =>
    estado.items.reduce((acc, i) => acc + i.cantidad, 0)
  )

  return (
    <div className="icono-carrito">
      🛒
      {totalUnidades > 0 && (
        <span className="badge">{totalUnidades}</span>
      )}
    </div>
  )
}
```

### 3.3 Panel del carrito

```jsx
// components/PanelCarrito.jsx
'use client'

import { useCarritoStore } from '@/store/carritoStore'
import { confirmarPedido } from '@/app/actions/pedidos'

export default function PanelCarrito() {
  const { items, mesaId, quitarItem, eliminarItem, vaciarCarrito } =
    useCarritoStore()

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

  async function handleConfirmar() {
    if (!mesaId) {
      alert('No hay mesa seleccionada. Escanea el QR de tu mesa.')
      return
    }
    // Server Action: crea el pedido y los pedido_items en Supabase
    await confirmarPedido({ items, mesaId })
    vaciarCarrito()
  }

  if (items.length === 0) return <p>El carrito está vacío</p>

  return (
    <div className="panel-carrito">
      {items.map((item) => (
        <div key={item.id} className="carrito-item">
          <span>{item.nombre}</span>
          <button onClick={() => quitarItem(item.id)}>–</button>
          <span>{item.cantidad}</span>
          <button onClick={() => quitarItem(item.id)}>+</button>
          <span>{(item.precio * item.cantidad).toFixed(2)} €</span>
          <button onClick={() => eliminarItem(item.id)}>🗑</button>
        </div>
      ))}

      <p className="total">Total: {total.toFixed(2)} €</p>
      <button onClick={handleConfirmar}>Confirmar pedido</button>
    </div>
  )
}
```

### 3.4 Selector de sala VIP (flujo por pasos)

```jsx
// components/SelectorSalaVip.jsx
'use client'

import { useReservaStore } from '@/store/reservaStore'

export default function SelectorSalaVip({ salas }) {
  const { paso, salaSeleccionada, seleccionarSala, seleccionarHorario, retroceder } =
    useReservaStore()

  // Paso 1: lista de salas disponibles
  if (paso === 1) {
    return (
      <div>
        <h2>Elige tu sala VIP</h2>
        {salas.map((sala) => (
          <div key={sala.id} onClick={() => seleccionarSala(sala)}>
            <img src={sala.imagen_url} alt={sala.nombre} />
            <h3>{sala.nombre}</h3>
            <p>{sala.precio_hora} €/hora</p>
          </div>
        ))}
      </div>
    )
  }

  // Paso 2: seleccionar horario
  if (paso === 2) {
    function handleHorario(e) {
      e.preventDefault()
      const inicio = new Date(e.target.inicio.value)
      const fin    = new Date(e.target.fin.value)
      if (fin <= inicio) {
        alert('La hora de fin debe ser posterior a la de inicio.')
        return
      }
      seleccionarHorario(inicio, fin)
    }

    return (
      <div>
        <button onClick={retroceder}>← Volver</button>
        <h2>Horario para {salaSeleccionada.nombre}</h2>
        <form onSubmit={handleHorario}>
          <label>Inicio: <input type="datetime-local" name="inicio" required /></label>
          <label>Fin:    <input type="datetime-local" name="fin"    required /></label>
          <button type="submit">Continuar al pago</button>
        </form>
      </div>
    )
  }

  // Paso 3: resumen antes del pago (el pago lo gestiona Stripe en el apunte 04)
  if (paso === 3) {
    const horas = (useReservaStore.getState().fechaFin - useReservaStore.getState().fechaInicio) / 3600000
    const total = (horas * salaSeleccionada.precio_hora).toFixed(2)

    return (
      <div>
        <button onClick={retroceder}>← Volver</button>
        <h2>Confirmar reserva</h2>
        <p>Sala: {salaSeleccionada.nombre}</p>
        <p>Horas: {horas}h · Total: {total} €</p>
        {/* El botón de pago irá aquí — ver apunte 04 */}
      </div>
    )
  }
}
```

---

## 4. Sincronización de UI sin recargar

Zustand actualiza la UI de forma automática cuando cambia el estado. No hace falta `useEffect` ni llamadas manuales. El flujo es:

```
Usuario pulsa "Añadir" → agregarItem() → Zustand actualiza items
                       ↓
Todos los componentes suscritos a 'items' se re-renderizan automáticamente
(PanelCarrito, IconoCarrito, etc.)
```

**Suscripción selectiva** (importante para rendimiento):

```js
// MAL: se suscribe a TODO el estado → re-render en cualquier cambio
const estado = useCarritoStore()

// BIEN: solo re-renderiza cuando cambia 'items'
const items = useCarritoStore((estado) => estado.items)

// MEJOR: solo re-renderiza cuando cambia el número de unidades
const totalUnidades = useCarritoStore((estado) =>
  estado.items.reduce((acc, i) => acc + i.cantidad, 0)
)
```

---

## 5. Acceder al store fuera de React (Server Actions)

Zustand funciona fuera de componentes React si lo necesitas:

```js
// app/actions/pedidos.js
'use server'

import { supabase } from '@/lib/supabase'

/**
 * Server Action: crea el pedido y sus ítems en Supabase.
 * Recibe los datos del carrito serializados (no puede recibir el store directamente).
 */
export async function confirmarPedido({ items, mesaId }) {
  // Obtener el usuario autenticado en el servidor
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const total = items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)

  // Crear el pedido
  const { data: pedido, error: errorPedido } = await supabase
    .from('pedidos')
    .insert({ mesa_id: mesaId, cliente_id: user.id, total })
    .select()
    .single()

  if (errorPedido) throw new Error(errorPedido.message)

  // Crear las líneas del pedido
  const lineas = items.map((item) => ({
    pedido_id:   pedido.id,
    producto_id: item.id,
    cantidad:    item.cantidad,
    precio_unit: item.precio,  // snapshot del precio
  }))

  const { error: errorItems } = await supabase
    .from('pedido_items')
    .insert(lineas)

  if (errorItems) throw new Error(errorItems.message)

  return pedido
}
```

---

## Reto Flex 🎸

1. Añade al `carritoStore` una acción `aplicarDescuento(codigo)` que:
   - Acepte los códigos `'FLEX10'` (10% de descuento) y `'FLEX20'` (20%).
   - Guarde el descuento aplicado en el estado (`descuento: 0`).
   - Si el código no es válido, lance un error con el mensaje `'Código no válido'`.

2. Modifica el componente `PanelCarrito` para mostrar:
   - Un input para introducir el código.
   - El precio con descuento aplicado.

3. Persiste el descuento en localStorage junto con `items` y `mesaId`.

> **Pista:** Usa el campo `partialize` del middleware `persist` para incluir también `descuento` en los datos guardados.

---

## Navegación

| | |
|---|---|
| [← 02 — Seguridad con RLS](./02-seguridad-rls.md) | [04 — Stripe y Edge Functions →](./04-stripe-y-edge-functions.md) |
