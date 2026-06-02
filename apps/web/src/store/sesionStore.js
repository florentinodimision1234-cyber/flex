import { create } from 'zustand'

export const useSesionStore = create((set) => ({
  usuario: null,   // objeto user de Supabase Auth (id, email…)
  rol: null,       // 'cliente' | 'staff' | 'portero' | 'admin'
  cargando: true,  // true mientras comprobamos la sesión al arrancar

  setSesion(usuario, rol) {
    set({ usuario, rol, cargando: false })
  },

  limpiarSesion() {
    set({ usuario: null, rol: null, cargando: false })
  },
}))