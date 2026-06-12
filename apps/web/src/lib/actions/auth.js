'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const ROLES = new Set(['cliente', 'staff', 'portero', 'admin'])

function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

function validarRol(rol) {
  if (!ROLES.has(rol)) throw new Error('Rol no valido.')
}

export async function login(formData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (error) return { error: 'Email o contraseña incorrectos.' }
  redirect('/')
}

export async function register(formData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email: formData.get('email'),
    password: formData.get('password'),
    options: { data: { nombre: formData.get('nombre') } },
  })
  if (error) return { error: error.message }
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function cambiarRolUsuario(id, rol) {
  validarRol(rol)
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from('perfiles')
    .update({ rol })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function crearUsuarioAdmin(formData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const rol = String(formData.get('rol') ?? 'cliente')

  validarRol(rol)

  if (!nombre || !email || password.length < 8) {
    throw new Error('Nombre, email y contrasena de al menos 8 caracteres son obligatorios.')
  }

  const supabaseAdmin = createAdminClient()
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nombre, full_name: nombre },
  })

  if (error) throw new Error(error.message)

  const { error: perfilError } = await supabaseAdmin
    .from('perfiles')
    .upsert({ id: data.user.id, nombre, rol }, { onConflict: 'id' })

  if (perfilError) throw new Error(perfilError.message)
  revalidatePath('/admin')
}

export async function borrarUsuarioAdmin(id) {
  const supabaseAdmin = createAdminClient()
  const { error } = await supabaseAdmin.auth.admin.deleteUser(id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}
