// Importamos create desde Zustand.
// create() sirve para crear un store global.
import { create } from 'zustand'


// Creamos y exportamos el store.
// El nombre empieza por "use" porque luego se usa como un hook.
export const useReservaStore = create((set, get) => ({

  // =========================================================
  // ESTADO GLOBAL
  // =========================================================

  // Guarda la sala que el usuario seleccionó.
  // Al principio no hay ninguna.
  salaSeleccionada: null,

  // Fecha/hora de inicio de la reserva.
  fechaInicio: null,

  // Fecha/hora de fin de la reserva.
  fechaFin: null,

  // Paso actual del flujo de reserva.
  //
  // Ejemplo:
  // 1 = elegir sala
  // 2 = elegir horario
  // 3 = confirmar pago
  paso: 1,



  // =========================================================
  // ACCIÓN: seleccionarSala
  // =========================================================
  //
  // Esta función se ejecuta cuando el usuario elige una sala.
  //
  // Recibe un objeto "sala".
  //
  // Ejemplo:
  // {
  //   nombre: 'Sala VIP',
  //   precio_hora: 20
  // }
  //
  seleccionarSala(sala) {

    // set() actualiza el estado global.
    //
    // Aquí:
    // - guardamos la sala elegida
    // - avanzamos al paso 2
    set({
      salaSeleccionada: sala,
      paso: 2
    })
  },



  // =========================================================
  // ACCIÓN: seleccionarHorario
  // =========================================================
  //
  // Guarda fecha inicio y fecha fin.
  //
  // Ejemplo:
  //
  // seleccionarHorario(
  //   new Date('2026-05-28 18:00'),
  //   new Date('2026-05-28 20:00')
  // )
  //
  seleccionarHorario(inicio, fin) {

    // Guardamos ambas fechas
    // y avanzamos al paso 3.
    set({
      fechaInicio: inicio,
      fechaFin: fin,
      paso: 3
    })
  },



  // =========================================================
  // ACCIÓN: retroceder
  // =========================================================
  //
  // Hace que el usuario vuelva atrás
  // en el flujo de reserva.
  //
  retroceder() {

    // Aquí usamos:
    //
    // set((estadoActual) => nuevoEstado)
    //
    // porque necesitamos leer el estado previo.
    set((estado) => ({

      // Reducimos el paso en 1.
      //
      // Math.max evita que el valor
      // baje de 1.
      //
      // Ejemplos:
      //
      // paso = 3 -> 2
      // paso = 2 -> 1
      // paso = 1 -> 1
      //
      paso: Math.max(1, estado.paso - 1)

    }))
  },



  // =========================================================
  // ACCIÓN: resetReserva
  // =========================================================
  //
  // Reinicia toda la reserva.
  //
  // Muy útil:
  // - después de pagar
  // - después de cancelar
  // - al cerrar sesión
  //
  resetReserva() {

    // Volvemos al estado inicial.
    set({

      // Quitamos sala seleccionada
      salaSeleccionada: null,

      // Borramos fechas
      fechaInicio: null,
      fechaFin: null,

      // Volvemos al paso 1
      paso: 1
    })
  },



  // =========================================================
  // GETTER: totalReserva
  // =========================================================
  //
  // Esto es una propiedad calculada.
  //
  // Se usa así:
  //
  // const total = useReservaStore(
  //   state => state.totalReserva
  // )
  //
  get totalReserva() {

    // get() obtiene el estado actual del store.
    const {
      salaSeleccionada,
      fechaInicio,
      fechaFin
    } = get()



    // =====================================================
    // VALIDACIÓN
    // =====================================================
    //
    // Si falta algún dato:
    // - sala
    // - fecha inicio
    // - fecha fin
    //
    // devolvemos 0.
    //
    if (
      !salaSeleccionada ||
      !fechaInicio ||
      !fechaFin
    ) {
      return 0
    }



    // =====================================================
    // CALCULAR HORAS
    // =====================================================
    //
    // En JavaScript:
    //
    // fechaFin - fechaInicio
    //
    // devuelve milisegundos.
    //
    // Para convertir a horas:
    //
    // 1000 ms = 1 segundo
    // 60 segundos = 1 minuto
    // 60 minutos = 1 hora
    //
    // Fórmula:
    //
    // milisegundos / (1000 * 60 * 60)
    //
    const horas =
      (fechaFin - fechaInicio) /
      (1000 * 60 * 60)



    // =====================================================
    // CALCULAR TOTAL
    // =====================================================
    //
    // Multiplicamos:
    //
    // horas * precio por hora
    //
    // Ejemplo:
    //
    // 3 horas * 20€
    // = 60€
    //
    const total =
      horas * salaSeleccionada.precio_hora



    // =====================================================
    // SEGURIDAD
    // =====================================================
    //
    // Math.max evita devolver números negativos.
    //
    // Si algo falla y total < 0,
    // devolverá 0.
    //
    return Math.max(0, total)
  },
}))
