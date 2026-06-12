import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useCarritoStore = create(
  persist(
    (set, get) => ({
      items: [],
      mesaId: null,

      setMesa(mesaId) {
        set({ mesaId })
      },

      agregarItem(producto) {
        set((estado) => {
          const existente = estado.items.find((i) => i.id === producto.id)
          if (existente) {
            return {
              items: estado.items.map((i) =>
                i.id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i
              ),
            }
          }
          return { items: [...estado.items, { ...producto, cantidad: 1 }] }
        })
      },

      quitarItem(productoId) {
        set((estado) => ({
          items: estado.items
            .map((i) => i.id === productoId ? { ...i, cantidad: i.cantidad - 1 } : i)
            .filter((i) => i.cantidad > 0),
        }))
      },

      eliminarItem(productoId) {
        set((estado) => ({
          items: estado.items.filter((i) => i.id !== productoId),
        }))
      },

      vaciarCarrito() {
        set({ items: [], mesaId: null })
      },

      get totalUnidades() {
        return get().items.reduce((acc, i) => acc + i.cantidad, 0)
      },

      get totalPrecio() {
        return get().items.reduce((acc, i) => acc + i.precio * i.cantidad, 0)
      },
    }),
    {
      name: 'flex-carrito',
      partialize: (estado) => ({ items: estado.items, mesaId: estado.mesaId }),
    }
  )
)

// ============================================================
// ¿CÓMO USAR ESTE STORE EN COMPONENTES?
// ============================================================

/*
// Ejemplo 1: Botón "Añadir al carrito"
import { useCarritoStore } from '@/store/carritoStore'

export default function Producto({ producto }) {
  const agregarItem = useCarritoStore((estado) => estado.agregarItem)

  return (
    <button onClick={() => agregarItem(producto)}>
      + Añadir
    </button>
  )
}

// Ejemplo 2: Mostrar cantidad en carrito
export function IconoCarrito() {
  const totalUnidades = useCarritoStore((estado) => estado.totalUnidades)

  return <span className="badge">{totalUnidades}</span>
}

// Ejemplo 3: Panel del carrito
export function Carrito() {
  const { items, totalPrecio, quitarItem } = useCarritoStore()

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>
          <p>{item.nombre} × {item.cantidad}</p>
          <p>{item.precio * item.cantidad}€</p>
          <button onClick={() => quitarItem(item.id)}>-</button>
        </div>
      ))}
      <h3>Total: {totalPrecio}€</h3>
    </div>
  )
}
*/
