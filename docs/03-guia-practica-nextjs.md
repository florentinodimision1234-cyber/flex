# 03 — Guía Práctica: PostgreSQL + Seguridad + Next.js

> Una guía simplificada para conectar tu base de datos Supabase a Next.js con seguridad desde el primer día

---

## Tabla de Contenidos

1. [Conceptos básicos de PostgreSQL](#conceptos-básicos)
2. [Seguridad con Row Level Security](#seguridad-rls)
3. [Conectar Supabase a Next.js](#conectar-nextjs)
4. [Ejemplos prácticos: Desde simple hasta complejo](#ejemplos-prácticos)
5. [Checklist de seguridad](#checklist)

---

## Conceptos Básicos

### ¿Qué necesitas entender?

PostgreSQL guarda datos en **tablas** (como hojas de Excel). Cada fila es un registro, cada columna es un campo.

```
Tabla: usuarios
┌────┬──────────┬──────────────────┐
│ id │ nombre   │ email            │
├────┼──────────┼──────────────────┤
│  1 │ María    │ maria@email.com  │
│  2 │ Carlos   │ carlos@email.com │
└────┴──────────┴──────────────────┘
```

### 1. Restricciones: Las reglas de la base de datos

Las restricciones garantizan que tus datos siempre sean válidos. La base de datos las comprueba **automáticamente**, independientemente de quién modifique los datos.

#### NOT NULL: "Este campo es obligatorio"

```sql
CREATE TABLE usuarios (
  id serial PRIMARY KEY,
  nombre text NOT NULL,  -- no puede estar vacío
  email text             -- puede estar vacío
);
```

**Ejemplo en código:** si intentas insertar un usuario sin nombre, PostgreSQL lo rechaza.

#### DEFAULT: "Rellena esto automáticamente si no lo especifico"

```sql
CREATE TABLE mensajes (
  id serial PRIMARY KEY,
  contenido text NOT NULL,
  leido boolean DEFAULT false,        -- por defecto: no leído
  creado_en timestamptz DEFAULT now() -- por defecto: la hora actual
);
```

**Uso en Next.js:**
```javascript
// No necesitas enviar creado_en desde el frontend
// La base de datos lo rellena automáticamente
const { data, error } = await supabase
  .from('mensajes')
  .insert([{ contenido: 'Hola' }]);
```

#### UNIQUE: "No puede haber dos iguales"

```sql
CREATE TABLE usuarios (
  id serial PRIMARY KEY,
  email text UNIQUE NOT NULL  -- no pueden existir dos usuarios con el mismo email
);
```

#### CHECK: "Valida una regla"

```sql
CREATE TABLE pedidos (
  id serial PRIMARY KEY,
  estado text CHECK (estado IN ('pendiente', 'pagado', 'completado'))
);

-- Esto funciona:
INSERT INTO pedidos (estado) VALUES ('pagado');

-- Esto falla (estado inválido):
INSERT INTO pedidos (estado) VALUES ('cancelado');
```

#### PRIMARY KEY: "Identificador único"

```sql
CREATE TABLE usuarios (
  id serial PRIMARY KEY  -- cada usuario tiene un número único que no se repite
);
```

#### FOREIGN KEY: "Conectar tablas"

La restricción más importante. Dice: "este dato debe existir en otra tabla".

```sql
-- Tabla padre
CREATE TABLE usuarios (
  id serial PRIMARY KEY
);

-- Tabla hija: cada comentario pertenece a un usuario
CREATE TABLE comentarios (
  id serial PRIMARY KEY,
  usuario_id int REFERENCES usuarios(id) ON DELETE CASCADE
  -- si se borra el usuario, se borran sus comentarios
);

-- Esto funciona:
INSERT INTO comentarios (usuario_id) VALUES (1); -- usuario 1 existe

-- Esto falla:
INSERT INTO comentarios (usuario_id) VALUES (999); -- usuario 999 no existe
```

---

### 2. Extensiones: Potencias extras

Las extensiones son características opcionales que activas cuando las necesitas.

```sql
-- Activar la extensión btree_gist
-- Se necesita para evitar que se solapen rangos de fechas
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

---

### 3. Funciones: Código reutilizable en la BD

Una función es código que vive en la base de datos y se ejecuta automáticamente.

#### Función simple

```sql
CREATE OR REPLACE FUNCTION precio_con_iva(precio numeric)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT precio * 1.21
$$;

-- Usarla:
SELECT precio_con_iva(10.00);  -- devuelve 12.10
```

#### Función con lógica compleja

```sql
CREATE OR REPLACE FUNCTION categorizar_pedido(total numeric)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  categoria text;
BEGIN
  IF total < 50 THEN
    categoria := 'pequeño';
  ELSIF total < 100 THEN
    categoria := 'mediano';
  ELSE
    categoria := 'grande';
  END IF;
  RETURN categoria;
END;
$$;
```

---

### 4. Triggers: "Cuando X ocurra, haz Y automáticamente"

Un trigger ejecuta una función automáticamente cuando algo ocurre en la tabla.

#### Ejemplo: Calcular automáticamente el total

```sql
-- Primero, la tabla
CREATE TABLE pedidos (
  id serial PRIMARY KEY,
  cantidad int NOT NULL,
  precio_unitario numeric(8,2) NOT NULL,
  total numeric(8,2)  -- se calcula automáticamente
);

-- Luego, la función que calcula
CREATE OR REPLACE FUNCTION calcular_total_pedido()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.total := NEW.precio_unitario * NEW.cantidad;
  RETURN NEW;
END;
$$;

-- Finalmente, el trigger que ejecuta la función
CREATE TRIGGER trigger_calcular_total
  BEFORE INSERT ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION calcular_total_pedido();

-- Cuando insertes:
INSERT INTO pedidos (cantidad, precio_unitario) VALUES (3, 10.00);
-- El total se calcula automáticamente: 30.00
```

#### Ejemplo: Registrar cambios

```sql
-- Tabla para guardar qué cambios ocurren
CREATE TABLE auditoria (
  id serial PRIMARY KEY,
  tabla text,
  operacion text,  -- 'INSERT', 'UPDATE', 'DELETE'
  datos_anteriores jsonb,
  datos_nuevos jsonb,
  creado_en timestamptz DEFAULT now()
);

-- Función para registrar en auditoría
CREATE OR REPLACE FUNCTION registrar_cambio()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO auditoria (tabla, operacion, datos_anteriores, datos_nuevos)
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    row_to_json(OLD),
    row_to_json(NEW)
  );
  RETURN NEW;
END;
$$;

-- Aplicar a la tabla usuarios
CREATE TRIGGER trigger_auditoria_usuarios
  AFTER UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION registrar_cambio();
```

---

## Seguridad: Row Level Security (RLS)

### El problema

Sin RLS, si alguien abre las herramientas de desarrollador del navegador, puede ver tu API key y hacer peticiones directas a la BD, saltando toda la validación del frontend.

```
❌ SIN SEGURIDAD:
Cliente malintencionado → abre DevTools → copia API key → accede a TODO
```

```
✅ CON RLS:
Cliente malintencionado → intenta acceder → PostgreSQL dice "no" → bloqueado
```

### Cómo funciona

RLS dice a PostgreSQL: "filtra automáticamente los datos que cada usuario puede ver".

### Paso 1: Entender quién es el usuario

PostgreSQL siempre sabe quién hace cada petición:

```sql
-- Devuelve el UUID del usuario autenticado (null si no está autenticado)
SELECT auth.uid();

-- Devuelve el rol: 'anon' (no autenticado), 'authenticated' (autenticado), 'service_role' (servidor)
SELECT auth.role();
```

### Paso 2: Activar RLS

```sql
-- Activar RLS en una tabla
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- ⚠️ IMPORTANTE: Con RLS activo y sin políticas, nadie puede ver nada
-- Es un estado seguro por defecto
```

### Paso 3: Crear políticas

Una política es una regla: "permite esta operación si se cumple esta condición".

#### Ejemplo: Un usuario ve solo sus datos

```sql
-- Un cliente ve solo sus propios pedidos
CREATE POLICY "cliente: ver sus pedidos"
  ON public.pedidos
  FOR SELECT
  USING (cliente_id = auth.uid());

-- Explicación:
-- FOR SELECT: aplica a lecturas
-- USING: condición que el registro debe cumplir
-- cliente_id = auth.uid(): el cliente_id de la fila debe ser el UUID del usuario actual
```

#### Ejemplo: Un usuario puede insertar, pero solo como él mismo

```sql
-- Un cliente puede crear pedidos, pero solo con su propio ID
CREATE POLICY "cliente: crear pedidos"
  ON public.pedidos
  FOR INSERT
  WITH CHECK (cliente_id = auth.uid());

-- Explicación:
-- FOR INSERT: aplica a inserciones
-- WITH CHECK: valida los datos nuevos antes de guardarlos
-- Si alguien intenta insertar cliente_id = otro_uuid, falla
```

#### Ejemplo: Un usuario puede editar, pero solo ciertos campos

```sql
-- Un cliente edita sus pedidos, pero no puede cambiar el total
CREATE POLICY "cliente: editar sus pedidos"
  ON public.pedidos
  FOR UPDATE
  USING (cliente_id = auth.uid())        -- qué filas puede tocar
  WITH CHECK (
    cliente_id = auth.uid()               -- el cliente sigue siendo el mismo
    AND total = (SELECT total FROM public.pedidos WHERE id = pedidos.id)  -- el total no cambia
  );
```

### Crear una función helper para roles de negocio

Si tienes roles como 'cliente', 'staff', 'admin', crea una función helper:

```sql
-- Función que devuelve el rol del usuario actual
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$;

-- Ahora puedes usarla en cualquier política
CREATE POLICY "admin: ver todo"
  ON public.pedidos
  FOR SELECT
  USING (public.mi_rol() = 'admin');

CREATE POLICY "staff: ver todos los pedidos"
  ON public.pedidos
  FOR SELECT
  USING (public.mi_rol() = 'staff');
```

### Políticas complejas con EXISTS

Cuando necesitas comprobar si algo existe en otra tabla:

```sql
-- Un usuario ve las lecciones solo de cursos en los que está matriculado
CREATE POLICY "alumno: ver lecciones de sus cursos"
  ON public.lecciones
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matriculas
      WHERE matriculas.curso_id = lecciones.curso_id
        AND matriculas.alumno_id = auth.uid()
    )
  );

-- Explicación:
-- EXISTS devuelve true si hay al menos una fila
-- SELECT 1: no necesitamos los datos, solo saber si existe
```

---

## Conectar Supabase a Next.js

### Paso 1: Crear el proyecto Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una nueva organización/proyecto
3. Guarda tu **Project URL** y **Anon Key** (los necesitarás)

### Paso 2: Instalar las dependencias

```bash
# En tu proyecto Next.js
npm install @supabase/supabase-js

# También necesitarás tailwind (si no lo tienes):
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Paso 3: Crear variables de entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

⚠️ Las variables con `NEXT_PUBLIC_` se envían al navegador. Solo usa la `anon key`, **nunca** la `service_role key`.

### Paso 4: Crear el cliente de Supabase

Crea el archivo `lib/supabase.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### Paso 5: Usar el cliente en tus componentes

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const obtenerPedidos = async () => {
      // RLS filtra automáticamente: solo tu usuario ve sus pedidos
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) console.error(error);
      else setPedidos(data);
      
      setCargando(false);
    };

    obtenerPedidos();
  }, []);

  if (cargando) return <div>Cargando...</div>;

  return (
    <div className="space-y-4">
      {pedidos.map(pedido => (
        <div key={pedido.id} className="border p-4 rounded-lg">
          <p className="font-bold">Pedido #{pedido.id}</p>
          <p>Total: ${pedido.total}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Ejemplos Prácticos: De Simple a Complejo

### 🟢 Nivel 1: Tabla simple con visualización

**Caso:** Una aplicación para listar productos

#### Base de datos

```sql
CREATE TABLE public.productos (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  precio numeric(8,2) NOT NULL CHECK (precio > 0),
  descripcion text,
  stock int DEFAULT 0 CHECK (stock >= 0),
  creado_en timestamptz DEFAULT now()
);

-- Permitir que cualquiera vea los productos
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos: ver productos"
  ON public.productos
  FOR SELECT
  USING (true);  -- true = permitir a todos
```

#### Componente React

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ListaProductos() {
  const [productos, setProductos] = useState([]);

  useEffect(() => {
    const obtener = async () => {
      const { data } = await supabase.from('productos').select('*');
      setProductos(data || []);
    };
    obtener();
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4 p-6">
      {productos.map(p => (
        <div key={p.id} className="border rounded-lg p-4 hover:shadow-lg transition">
          <h3 className="font-bold text-lg">{p.nombre}</h3>
          <p className="text-gray-600 mb-2">{p.descripcion}</p>
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-green-600">${p.precio}</span>
            <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Comprar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

### 🟡 Nivel 2: Autenticación y datos del usuario

**Caso:** Los usuarios ven solo sus propios pedidos

#### Base de datos

```sql
-- Tabla de usuarios (perfiles)
CREATE TABLE public.perfiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  rol text DEFAULT 'cliente' CHECK (rol IN ('cliente', 'staff', 'admin'))
);

-- Tabla de pedidos del usuario
CREATE TABLE public.pedidos (
  id serial PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  total numeric(8,2) NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado', 'completado')),
  creado_en timestamptz DEFAULT now()
);

-- RLS: cada usuario ve solo sus pedidos
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente: ver sus pedidos"
  ON public.pedidos
  FOR SELECT
  USING (cliente_id = auth.uid());

CREATE POLICY "cliente: crear pedidos"
  ON public.pedidos
  FOR INSERT
  WITH CHECK (cliente_id = auth.uid());
```

#### Componente: Login

```javascript
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setCargando(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) alert('Error: ' + error.message);
    else window.location.reload();
    
    setCargando(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleLogin} className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h2 className="text-2xl font-bold mb-6">Iniciar Sesión</h2>
        
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-2 mb-4"
          required
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg p-2 mb-6"
          required
        />
        
        <button
          type="submit"
          disabled={cargando}
          className="w-full bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {cargando ? 'Cargando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
```

#### Componente: Ver mis pedidos

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function MisPedidos() {
  const [pedidos, setPedidos] = useState([]);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtenerDatos = async () => {
      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      setUsuario(user);

      if (!user) return;

      // RLS automáticamente filtra: solo SUS pedidos
      const { data } = await supabase
        .from('pedidos')
        .select('*')
        .eq('cliente_id', user.id)
        .order('creado_en', { ascending: false });

      setPedidos(data || []);
    };

    obtenerDatos();
  }, []);

  if (!usuario) return <div className="p-6 text-center">Debes iniciar sesión</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Mis Pedidos</h2>
      
      <div className="space-y-4">
        {pedidos.map(pedido => (
          <div key={pedido.id} className="border rounded-lg p-4 bg-white shadow">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold">Pedido #{pedido.id}</h3>
              <span className={`px-3 py-1 rounded text-sm font-bold ${
                pedido.estado === 'completado' ? 'bg-green-100 text-green-800' :
                pedido.estado === 'pagado' ? 'bg-blue-100 text-blue-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {pedido.estado}
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-2">${pedido.total}</p>
            <p className="text-gray-500 text-sm">
              {new Date(pedido.creado_en).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 🔴 Nivel 3: Roles, permisos y operaciones complejas

**Caso:** Staff ve todos los pedidos y puede cambiar su estado

#### Base de datos

```sql
-- Función helper para roles
CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid()
$$;

-- RLS: políticas complejas
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- 1. Cliente ve solo sus pedidos
CREATE POLICY "cliente: ver sus pedidos"
  ON public.pedidos
  FOR SELECT
  USING (
    cliente_id = auth.uid()
    AND public.mi_rol() = 'cliente'
  );

-- 2. Staff ve todos los pedidos
CREATE POLICY "staff: ver todos los pedidos"
  ON public.pedidos
  FOR SELECT
  USING (public.mi_rol() IN ('staff', 'admin'));

-- 3. Staff puede actualizar el estado (USANDO)
CREATE POLICY "staff: cambiar estado de pedidos"
  ON public.pedidos
  FOR UPDATE
  USING (public.mi_rol() IN ('staff', 'admin'))
  WITH CHECK (
    public.mi_rol() IN ('staff', 'admin')
    AND (estado IN ('pagado', 'completado'))  -- solo estos estados
  );
```

#### Componente: Panel de staff

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function PanelStaff() {
  const [pedidos, setPedidos] = useState([]);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuario(user);

      // RLS: como es staff, ve TODOS los pedidos
      const { data } = await supabase
        .from('pedidos')
        .select('*, perfiles(nombre)')
        .order('creado_en', { ascending: false });

      setPedidos(data || []);
    };
    obtener();
  }, []);

  const cambiarEstado = async (pedidoId, nuevoEstado) => {
    const { error } = await supabase
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', pedidoId);

    if (error) alert('Error: ' + error.message);
    else {
      // Actualizar local
      setPedidos(pedidos.map(p => 
        p.id === pedidoId ? { ...p, estado: nuevoEstado } : p
      ));
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6">Panel de Gestión de Pedidos</h2>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-200 border-b">
            <tr>
              <th className="px-6 py-3 text-left">ID</th>
              <th className="px-6 py-3 text-left">Cliente</th>
              <th className="px-6 py-3 text-left">Total</th>
              <th className="px-6 py-3 text-left">Estado</th>
              <th className="px-6 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map(pedido => (
              <tr key={pedido.id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-bold">#{pedido.id}</td>
                <td className="px-6 py-4">{pedido.perfiles?.nombre}</td>
                <td className="px-6 py-4 font-bold text-green-600">${pedido.total}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded text-sm bg-yellow-100 text-yellow-800">
                    {pedido.estado}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2">
                  <button
                    onClick={() => cambiarEstado(pedido.id, 'pagado')}
                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Pagar
                  </button>
                  <button
                    onClick={() => cambiarEstado(pedido.id, 'completado')}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                  >
                    Completar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### 🟠 Nivel 4: Relaciones entre tablas

**Caso:** Un sistema de comentarios donde los usuarios comentan en productos

#### Base de datos

```sql
-- Tabla de productos
CREATE TABLE public.productos (
  id serial PRIMARY KEY,
  nombre text NOT NULL,
  descripcion text
);

-- Tabla de comentarios (relación a productos y usuarios)
CREATE TABLE public.comentarios (
  id serial PRIMARY KEY,
  producto_id int NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  creado_en timestamptz DEFAULT now()
);

-- RLS: todos ven los comentarios, pero solo pueden crear los suyos
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos: ver comentarios"
  ON public.comentarios
  FOR SELECT
  USING (true);

CREATE POLICY "usuario: crear comentarios"
  ON public.comentarios
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "usuario: borrar sus comentarios"
  ON public.comentarios
  FOR DELETE
  USING (usuario_id = auth.uid());
```

#### Componente: Sección de comentarios

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ComentariosProducto({ productoId }) {
  const [comentarios, setComentarios] = useState([]);
  const [nuevo, setNuevo] = useState('');
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuario(user);

      // Obtener comentarios CON nombres de usuarios
      const { data } = await supabase
        .from('comentarios')
        .select('*, perfiles(nombre)')
        .eq('producto_id', productoId)
        .order('creado_en', { ascending: false });

      setComentarios(data || []);
    };
    obtener();
  }, [productoId]);

  const agregarComentario = async (e) => {
    e.preventDefault();
    if (!nuevo.trim() || !usuario) return;

    const { error } = await supabase
      .from('comentarios')
      .insert([{
        producto_id: productoId,
        usuario_id: usuario.id,
        contenido: nuevo
      }]);

    if (error) alert('Error: ' + error.message);
    else {
      setNuevo('');
      // Refrescar comentarios
      const { data } = await supabase
        .from('comentarios')
        .select('*, perfiles(nombre)')
        .eq('producto_id', productoId)
        .order('creado_en', { ascending: false });
      setComentarios(data);
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-xl font-bold mb-4">Comentarios</h3>

      {usuario && (
        <form onSubmit={agregarComentario} className="mb-6">
          <textarea
            value={nuevo}
            onChange={(e) => setNuevo(e.target.value)}
            placeholder="Escribe un comentario..."
            className="w-full border rounded-lg p-3 mb-2"
            rows="3"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Comentar
          </button>
        </form>
      )}

      <div className="space-y-4">
        {comentarios.map(c => (
          <div key={c.id} className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <p className="font-bold">{c.perfiles.nombre}</p>
              <p className="text-sm text-gray-500">
                {new Date(c.creado_en).toLocaleDateString()}
              </p>
            </div>
            <p>{c.contenido}</p>
            {usuario?.id === c.usuario_id && (
              <button
                onClick={() => supabase.from('comentarios').delete().eq('id', c.id).then(() => {
                  setComentarios(comentarios.filter(x => x.id !== c.id));
                })}
                className="text-red-500 text-sm mt-2 hover:underline"
              >
                Borrar
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### 🔵 Nivel 5: To-Do List completa (Mi primera app real)

**Caso:** Una app de tareas donde los usuarios crean listas personales

#### Base de datos

```sql
-- Tabla de listas de tareas
CREATE TABLE public.listas (
  id serial PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

-- Tabla de tareas individuales
CREATE TABLE public.tareas (
  id serial PRIMARY KEY,
  lista_id int NOT NULL REFERENCES public.listas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descripcion text,
  completada boolean DEFAULT false,
  prioridad text DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta')),
  fecha_limite date,
  creado_en timestamptz DEFAULT now(),
  completada_en timestamptz
);

-- Trigger: actualizar timestamp de lista cuando cambia una tarea
CREATE OR REPLACE FUNCTION actualizar_lista_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.listas SET actualizado_en = now() WHERE id = NEW.lista_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_actualizar_lista
  AFTER INSERT OR UPDATE ON public.tareas
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_lista_timestamp();

-- Trigger: registrar cuándo se completa una tarea
CREATE OR REPLACE FUNCTION registrar_completacion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completada = true AND OLD.completada = false THEN
    NEW.completada_en := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_completacion
  BEFORE UPDATE ON public.tareas
  FOR EACH ROW
  EXECUTE FUNCTION registrar_completacion();

-- RLS: cada usuario ve solo sus listas
ALTER TABLE public.listas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario: ver sus listas"
  ON public.listas
  FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "usuario: crear listas"
  ON public.listas
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "usuario: editar sus listas"
  ON public.listas
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "usuario: borrar sus listas"
  ON public.listas
  FOR DELETE
  USING (usuario_id = auth.uid());

-- RLS: cada usuario ve solo tareas de sus listas
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario: ver tareas de sus listas"
  ON public.tareas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listas
      WHERE listas.id = tareas.lista_id
        AND listas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "usuario: crear tareas en sus listas"
  ON public.tareas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listas
      WHERE listas.id = tareas.lista_id
        AND listas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "usuario: editar sus tareas"
  ON public.tareas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.listas
      WHERE listas.id = tareas.lista_id
        AND listas.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listas
      WHERE listas.id = tareas.lista_id
        AND listas.usuario_id = auth.uid()
    )
  );

CREATE POLICY "usuario: borrar sus tareas"
  ON public.tareas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.listas
      WHERE listas.id = tareas.lista_id
        AND listas.usuario_id = auth.uid()
    )
  );
```

#### Componente: Ver todas mis listas

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MisListas() {
  const [listas, setListas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [nueva, setNueva] = useState('');

  useEffect(() => {
    obtenerListas();
  }, []);

  const obtenerListas = async () => {
    const { data } = await supabase
      .from('listas')
      .select('*, tareas(id, completada)')
      .order('actualizado_en', { ascending: false });

    setListas(data || []);
    setCargando(false);
  };

  const crearLista = async (e) => {
    e.preventDefault();
    if (!nueva.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('listas').insert([{
      usuario_id: user.id,
      titulo: nueva
    }]);

    if (!error) {
      setNueva('');
      obtenerListas();
    }
  };

  const borrarLista = async (id) => {
    if (confirm('¿Borrar esta lista?')) {
      await supabase.from('listas').delete().eq('id', id);
      obtenerListas();
    }
  };

  if (cargando) return <div className="p-6 text-center">Cargando...</div>;

  const totalTareas = listas.reduce((sum, l) => sum + (l.tareas?.length || 0), 0);
  const completadas = listas.reduce((sum, l) => 
    sum + (l.tareas?.filter(t => t.completada).length || 0), 0
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Mis Tareas</h1>
          <p className="text-gray-600">
            {completadas} de {totalTareas} tareas completadas
          </p>
          <div className="mt-3 bg-blue-200 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all"
              style={{ width: `${totalTareas > 0 ? (completadas / totalTareas * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Crear nueva lista */}
        <form onSubmit={crearLista} className="mb-8 flex gap-2">
          <input
            type="text"
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            placeholder="Nueva lista..."
            className="flex-1 border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
          >
            + Crear
          </button>
        </form>

        {/* Grid de listas */}
        {listas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500 text-lg">No tienes listas aún</p>
            <p className="text-gray-400">Crea una para comenzar</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {listas.map(lista => {
              const tareasCompletas = lista.tareas?.filter(t => t.completada).length || 0;
              const totalTareasLista = lista.tareas?.length || 0;

              return (
                <Link href={`/tareas/${lista.id}`} key={lista.id}>
                  <div className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer p-6 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg text-gray-900">{lista.titulo}</h3>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          borrarLista(lista.id);
                        }}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        ✕
                      </button>
                    </div>

                    <p className="text-gray-600 mb-4">
                      {tareasCompletas} de {totalTareasLista} completadas
                    </p>

                    <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-500 h-full transition-all"
                        style={{ width: `${totalTareasLista > 0 ? (tareasCompletas / totalTareasLista * 100) : 0}%` }}
                      />
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Actualizado: {new Date(lista.actualizado_en).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
```

#### Componente: Ver tareas de una lista

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams } from 'next/navigation';

export default function VerLista() {
  const params = useParams();
  const listaId = params.id;

  const [lista, setLista] = useState(null);
  const [tareas, setTareas] = useState([]);
  const [nueva, setNueva] = useState('');
  const [prioridad, setPrioridad] = useState('normal');

  useEffect(() => {
    obtenerTareas();
  }, [listaId]);

  const obtenerTareas = async () => {
    const { data: listaData } = await supabase
      .from('listas')
      .select('*')
      .eq('id', listaId)
      .single();

    setLista(listaData);

    const { data: tareasData } = await supabase
      .from('tareas')
      .select('*')
      .eq('lista_id', listaId)
      .order('prioridad', { ascending: false })
      .order('creado_en', { ascending: true });

    setTareas(tareasData || []);
  };

  const agregarTarea = async (e) => {
    e.preventDefault();
    if (!nueva.trim()) return;

    const { error } = await supabase.from('tareas').insert([{
      lista_id: parseInt(listaId),
      titulo: nueva,
      prioridad
    }]);

    if (!error) {
      setNueva('');
      setPrioridad('normal');
      obtenerTareas();
    }
  };

  const toggleTarea = async (id, completada) => {
    await supabase
      .from('tareas')
      .update({ completada: !completada })
      .eq('id', id);

    obtenerTareas();
  };

  const borrarTarea = async (id) => {
    await supabase.from('tareas').delete().eq('id', id);
    obtenerTareas();
  };

  if (!lista) return <div className="p-6">Cargando...</div>;

  const completadas = tareas.filter(t => t.completada).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <a href="/tareas" className="text-blue-600 hover:text-blue-700 mb-4 inline-block">
            ← Volver
          </a>
          <h1 className="text-4xl font-bold text-gray-900">{lista.titulo}</h1>
          <p className="text-gray-600 mt-2">
            {completadas} de {tareas.length} tareas completadas
          </p>
        </div>

        {/* Crear nueva tarea */}
        <form onSubmit={agregarTarea} className="mb-8 bg-white p-6 rounded-lg shadow">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              placeholder="Nueva tarea..."
              className="flex-1 border border-gray-300 rounded-lg p-3"
            />
            <select
              value={prioridad}
              onChange={(e) => setPrioridad(e.target.value)}
              className="border border-gray-300 rounded-lg p-3"
            >
              <option value="baja">Baja</option>
              <option value="normal">Normal</option>
              <option value="alta">Alta</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-purple-600 text-white py-3 rounded-lg hover:bg-purple-700 font-semibold"
          >
            Agregar Tarea
          </button>
        </form>

        {/* Lista de tareas */}
        <div className="space-y-3">
          {tareas.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg">
              <p className="text-gray-500">No hay tareas aún</p>
            </div>
          ) : (
            tareas.map(tarea => (
              <div
                key={tarea.id}
                className={`bg-white rounded-lg p-4 shadow transition ${
                  tarea.completada ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    checked={tarea.completada}
                    onChange={() => toggleTarea(tarea.id, tarea.completada)}
                    className="mt-1 w-5 h-5 cursor-pointer"
                  />

                  <div className="flex-1">
                    <p className={`text-lg font-semibold ${
                      tarea.completada ? 'line-through text-gray-500' : 'text-gray-900'
                    }`}>
                      {tarea.titulo}
                    </p>
                    {tarea.descripcion && (
                      <p className="text-gray-600 mt-1">{tarea.descripcion}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        tarea.prioridad === 'alta' ? 'bg-red-100 text-red-800' :
                        tarea.prioridad === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {tarea.prioridad.toUpperCase()}
                      </span>
                      {tarea.completada_en && (
                        <span className="text-xs text-gray-500">
                          Completada: {new Date(tarea.completada_en).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => borrarTarea(tarea.id)}
                    className="text-red-500 hover:text-red-700 text-lg"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Más Ejemplos Prácticos

### Sistema de Blog con comentarios

**Base de datos:**

```sql
CREATE TABLE public.articulos (
  id serial PRIMARY KEY,
  autor_id uuid NOT NULL REFERENCES public.perfiles(id),
  titulo text NOT NULL,
  contenido text NOT NULL,
  slug text UNIQUE NOT NULL,
  publicado boolean DEFAULT false,
  vistas int DEFAULT 0,
  creado_en timestamptz DEFAULT now(),
  actualizado_en timestamptz DEFAULT now()
);

CREATE TABLE public.comentarios_articulos (
  id serial PRIMARY KEY,
  articulo_id int NOT NULL REFERENCES public.articulos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  contenido text NOT NULL,
  creado_en timestamptz DEFAULT now()
);

-- Trigger: incrementar vistas
CREATE OR REPLACE FUNCTION incrementar_vistas()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.articulos SET vistas = vistas + 1 WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

ALTER TABLE public.articulos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_articulos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos: ver articulos publicados"
  ON public.articulos
  FOR SELECT
  USING (publicado = true);

CREATE POLICY "autor: ver sus borradores"
  ON public.articulos
  FOR SELECT
  USING (autor_id = auth.uid());
```

**Componente React:**

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Blog() {
  const [articulos, setArticulos] = useState([]);

  useEffect(() => {
    const obtener = async () => {
      const { data } = await supabase
        .from('articulos')
        .select('*, perfiles(nombre)')
        .eq('publicado', true)
        .order('creado_en', { ascending: false });

      setArticulos(data || []);
    };
    obtener();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>

      <div className="grid gap-8">
        {articulos.map(articulo => (
          <article key={articulo.id} className="border-l-4 border-blue-500 pl-6">
            <h2 className="text-2xl font-bold mb-2">{articulo.titulo}</h2>
            <p className="text-gray-600 mb-4">
              Por <span className="font-semibold">{articulo.perfiles.nombre}</span> • 
              {new Date(articulo.creado_en).toLocaleDateString()} • 
              {articulo.vistas} vistas
            </p>
            <p className="text-gray-800 leading-relaxed mb-4">{articulo.contenido}</p>
            <a href={`/blog/${articulo.slug}`} className="text-blue-600 hover:underline">
              Leer más →
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
```

---

### Sistema de Carrito de compras

**Base de datos:**

```sql
CREATE TABLE public.carrito (
  id serial PRIMARY KEY,
  usuario_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  producto_id int NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  cantidad int NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  creado_en timestamptz DEFAULT now(),
  UNIQUE(usuario_id, producto_id)
);

-- Función para calcular total del carrito
CREATE OR REPLACE FUNCTION calcular_total_carrito(user_id uuid)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(SUM(productos.precio * carrito.cantidad), 0)
  FROM public.carrito
  JOIN public.productos ON carrito.producto_id = productos.id
  WHERE carrito.usuario_id = user_id
$$;

ALTER TABLE public.carrito ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario: ver su carrito"
  ON public.carrito
  FOR SELECT
  USING (usuario_id = auth.uid());

CREATE POLICY "usuario: editar su carrito"
  ON public.carrito
  FOR INSERT WITH CHECK (usuario_id = auth.uid())
  FOR UPDATE USING (usuario_id = auth.uid())
  FOR DELETE USING (usuario_id = auth.uid());
```

**Componente React:**

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Carrito() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [usuario, setUsuario] = useState(null);

  useEffect(() => {
    const obtener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuario(user);

      if (!user) return;

      const { data } = await supabase
        .from('carrito')
        .select('*, productos(nombre, precio)')
        .eq('usuario_id', user.id);

      setItems(data || []);

      // Calcular total
      const totalCalculado = (data || []).reduce((sum, item) => 
        sum + (item.productos.precio * item.cantidad), 0
      );
      setTotal(totalCalculado);
    };
    obtener();
  }, []);

  const actualizarCantidad = async (itemId, nuevaCantidad) => {
    if (nuevaCantidad <= 0) {
      await supabase.from('carrito').delete().eq('id', itemId);
    } else {
      await supabase.from('carrito').update({ cantidad: nuevaCantidad }).eq('id', itemId);
    }

    // Refrescar
    const { data } = await supabase
      .from('carrito')
      .select('*, productos(nombre, precio)')
      .eq('usuario_id', usuario.id);

    setItems(data || []);

    const totalCalculado = (data || []).reduce((sum, item) => 
      sum + (item.productos.precio * item.cantidad), 0
    );
    setTotal(totalCalculado);
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Tu Carrito</h1>

      {items.length === 0 ? (
        <p className="text-gray-500">El carrito está vacío</p>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {items.map(item => (
              <div key={item.id} className="border rounded-lg p-4 flex justify-between items-center">
                <div>
                  <p className="font-bold">{item.productos.nombre}</p>
                  <p className="text-gray-600">${item.productos.precio}</p>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                      className="bg-gray-300 px-3 py-1 rounded"
                    >
                      −
                    </button>
                    <span className="px-4">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                      className="bg-gray-300 px-3 py-1 rounded"
                    >
                      +
                    </button>
                  </div>

                  <p className="font-bold w-24 text-right">
                    ${(item.productos.precio * item.cantidad).toFixed(2)}
                  </p>

                  <button
                    onClick={() => actualizarCantidad(item.id, 0)}
                    className="text-red-600 hover:text-red-800"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t-2 pt-4">
            <div className="flex justify-between text-xl font-bold mb-4">
              <span>Total:</span>
              <span className="text-green-600">${total.toFixed(2)}</span>
            </div>
            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">
              Proceder al Pago
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### Sistema de calificaciones y reseñas

**Base de datos:**

```sql
CREATE TABLE public.resenas (
  id serial PRIMARY KEY,
  producto_id int NOT NULL REFERENCES public.productos(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.perfiles(id) ON DELETE CASCADE,
  calificacion int NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  titulo text NOT NULL,
  contenido text,
  utiles int DEFAULT 0,
  creado_en timestamptz DEFAULT now(),
  UNIQUE(producto_id, usuario_id)
);

-- Función para promediar calificaciones
CREATE OR REPLACE FUNCTION promedio_calificacion(prod_id int)
RETURNS numeric
LANGUAGE sql
STABLE
AS $$
  SELECT ROUND(AVG(calificacion)::numeric, 2)
  FROM public.resenas
  WHERE producto_id = prod_id
$$;

ALTER TABLE public.resenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos: ver resenas"
  ON public.resenas
  FOR SELECT
  USING (true);

CREATE POLICY "usuario: crear resena"
  ON public.resenas
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());
```

**Componente React:**

```javascript
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Resenas({ productoId }) {
  const [resenas, setResenas] = useState([]);
  const [nueva, setNueva] = useState({ calificacion: 5, titulo: '', contenido: '' });
  const [usuario, setUsuario] = useState(null);
  const [promedio, setPromedio] = useState(0);

  useEffect(() => {
    const obtener = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUsuario(user);

      // Obtener reseñas
      const { data } = await supabase
        .from('resenas')
        .select('*, perfiles(nombre)')
        .eq('producto_id', productoId)
        .order('creado_en', { ascending: false });

      setResenas(data || []);

      // Calcular promedio
      if (data && data.length > 0) {
        const prom = (data.reduce((sum, r) => sum + r.calificacion, 0) / data.length).toFixed(1);
        setPromedio(prom);
      }
    };
    obtener();
  }, [productoId]);

  const agregarResena = async (e) => {
    e.preventDefault();
    if (!usuario) {
      alert('Debes estar autenticado');
      return;
    }

    const { error } = await supabase.from('resenas').insert([{
      producto_id: productoId,
      usuario_id: usuario.id,
      calificacion: nueva.calificacion,
      titulo: nueva.titulo,
      contenido: nueva.contenido
    }]);

    if (!error) {
      setNueva({ calificacion: 5, titulo: '', contenido: '' });
      // Refrescar
      window.location.reload();
    }
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h3 className="text-2xl font-bold mb-4">Reseñas</h3>

      {/* Promedio */}
      <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold text-yellow-600">{promedio}</div>
          <div>
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => (
                <span key={i} className={i < Math.round(promedio) ? '⭐' : '☆'}>
                  {i < Math.round(promedio) ? '⭐' : '☆'}
                </span>
              ))}
            </div>
            <p className="text-gray-600">{resenas.length} reseñas</p>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {usuario && (
        <form onSubmit={agregarResena} className="mb-8 bg-gray-50 p-4 rounded-lg">
          <h4 className="font-bold mb-4">Escribe tu reseña</h4>

          <div className="mb-4">
            <label className="block mb-2 font-semibold">Calificación</label>
            <select
              value={nueva.calificacion}
              onChange={(e) => setNueva({ ...nueva, calificacion: parseInt(e.target.value) })}
              className="w-full border rounded p-2"
            >
              {[5, 4, 3, 2, 1].map(n => (
                <option key={n} value={n}>{n} ⭐ {['Excelente', 'Muy Bueno', 'Bueno', 'Regular', 'Malo'][5-n]}</option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={nueva.titulo}
            onChange={(e) => setNueva({ ...nueva, titulo: e.target.value })}
            placeholder="Título de la reseña"
            className="w-full border rounded p-2 mb-4"
            required
          />

          <textarea
            value={nueva.contenido}
            onChange={(e) => setNueva({ ...nueva, contenido: e.target.value })}
            placeholder="Tu comentario..."
            className="w-full border rounded p-2 mb-4"
            rows="4"
          />

          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
          >
            Publicar Reseña
          </button>
        </form>
      )}

      {/* Lista de reseñas */}
      <div className="space-y-4">
        {resenas.map(resena => (
          <div key={resena.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold">{resena.perfiles.nombre}</p>
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <span key={i}>{i < resena.calificacion ? '⭐' : '☆'}</span>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500">{new Date(resena.creado_en).toLocaleDateString()}</p>
            </div>
            <h5 className="font-semibold mb-1">{resena.titulo}</h5>
            <p className="text-gray-700">{resena.contenido}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Checklist de Seguridad

Antes de subir a producción, asegúrate de:

- [ ] **RLS activado** en todas las tablas que contienen datos sensibles
- [ ] **Políticas definidas** para cada operación (SELECT, INSERT, UPDATE, DELETE)
- [ ] **No exponer `service_role key`** al frontend (solo `anon key`)
- [ ] **Validación en la BD**: restricciones CHECK, NOT NULL, UNIQUE
- [ ] **Claves foráneas** conectando tablas relacionadas
- [ ] **Triggers** para calcular valores derivados o registrar cambios
- [ ] **Índices** en columnas que se usan frecuentemente en WHERE
- [ ] **Auditoría**: registrar quién cambió qué y cuándo
- [ ] **Backups automáticos** configurados en Supabase
- [ ] **Variables de entorno** no confirmadas en Git (`.env.local` en `.gitignore`)

---

## Comandos útiles

### Desarrollo local con Supabase

```bash
# Instalar Supabase CLI
npm install -g supabase

# Iniciar base de datos local
supabase start

# Ver logs
supabase logs --local

# Parar
supabase stop
```

### Ejecutar migraciones

```bash
# Crear nueva migración
supabase migration new nombre_migracion

# Aplicar migraciones
supabase migration up

# Ver estado
supabase migration list
```

### Trabajar con Next.js

```bash
# Crear proyecto Next.js
npx create-next-app@latest mi-app --typescript --tailwind

# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm start
```

---

## Recursos

- [Preparación de examen: Next.js + Base de datos + Login](./00-preparacion-examen-nextjs-db.md)
- [Ejemplos prácticos ejecutables](./07-ejemplos-practicos-ejecutables.md)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación PostgreSQL](https://www.postgresql.org/docs/)
- [Next.js + Supabase](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security (RLS)](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

## Próximos pasos

1. **Crea una tabla simple** (productos) y visualiza en Next.js
2. **Añade autenticación** (login/registro)
3. **Implementa RLS** y comprueba que funciona
4. **Añade relaciones** entre tablas (comentarios, pedidos, etc.)
5. **Usa triggers** para automatizar cálculos
6. **Implementa auditoría** para registrar cambios

---

**Última actualización:** 2026-05-21  
**Autor:** Flex Team
