# 00 — Guía simple de examen: Next.js + Base de datos + Login

> Esta guía resume los PDF y los apuntes de teoría, pero con el orden que necesitas para resolver un ejercicio de examen.

---

## 0. La idea principal

En el examen te pueden cambiar el tema de la app: coches, energía solar, hidrógeno, biblioteca, tienda, cursos, reservas.

Pero casi siempre la lógica es la misma:

```txt
1. Leo el enunciado.
2. Saco las pantallas que necesito.
3. Saco los componentes que se repiten.
4. Decido qué datos son temporales y cuáles van a la base de datos.
5. Diseño las tablas.
6. Conecto Next.js con Supabase.
7. Pinto datos con .select().
8. Creo datos con .insert().
9. Si hay usuarios, añado Auth y RLS.
```

No estudies memorizando proyectos enteros. Estudia este camino.

---

## 1. Qué aporta cada manual

| Material | Qué tienes que quedarte |
|---|---|
| Manual 1 Next.js | JSX, componentes, props, `useState`, `useEffect` |
| Manual 2 Next.js | rutas, `layout.js`, `children`, `Link`, `.map()`, `next/image` |
| Manual 3 Next.js | Server Component vs Client Component, APIs con secretos, rutas dinámicas, Server Actions |
| Manual 4 Next.js | estado global con Zustand, cuándo `useState` se queda corto |
| Manual Bases de datos | tablas, columnas, tipos, PK, FK, relaciones, CRUD, conectar Supabase |
| Manual Login/Register | cliente de navegador, cliente de servidor, login, register, callback, logout |
| Teoría 01 | constraints, funciones, triggers, Storage |
| Teoría 02 | roles, RLS, políticas, `USING`, `WITH CHECK`, `EXISTS`, `service_role` |

Si vas justo de tiempo, estudia primero los manuales 1, 2, Bases de datos y Login/Register.

---

## 2. Manual 1 explicado muy simple

El Manual 1 enseña a construir una pantalla con piezas reutilizables e interacción.

### 2.1 JSX

JSX parece HTML, pero puedes meter JavaScript entre llaves.

```jsx
export default function Page() {
  const nombre = "Vitoria-Sun";

  return (
    <main>
      <h1>{nombre}</h1>
      <p>Panel de energía solar</p>
    </main>
  );
}
```

Traducción:

```txt
Pinta un main.
Dentro pinta un h1.
El texto del h1 sale de una variable.
```

### 2.2 Componente

Un componente es una parte de pantalla que puedes reutilizar.

```jsx
export default function BloqueSolar() {
  return (
    <article>
      <h2>Sector Norte</h2>
      <p>Eficiencia: 95%</p>
    </article>
  );
}
```

Problema: si necesitas tres sectores, no quieres copiar tres veces el mismo código.

### 2.3 Props

Las props son datos que una página le pasa a un componente.

```jsx
export default function BloqueSolar({ nombre, eficiencia }) {
  return (
    <article>
      <h2>{nombre}</h2>
      <p>Eficiencia: {eficiencia}%</p>
    </article>
  );
}
```

Uso:

```jsx
<BloqueSolar nombre="Sector Norte" eficiencia={95} />
<BloqueSolar nombre="Sector Sur" eficiencia={88} />
<BloqueSolar nombre="Sector Este" eficiencia={91} />
```

Frase de examen:

```txt
Uso props cuando quiero reutilizar el mismo componente con datos distintos.
```

### 2.4 State con `useState`

El state es memoria dentro de un componente. Si cambia, la pantalla se actualiza.

```jsx
"use client";

import { useState } from "react";

export default function BloqueSolar({ nombre, eficiencia }) {
  const [kwh, setKwh] = useState(0);

  return (
    <article>
      <h2>{nombre}</h2>
      <p>Eficiencia: {eficiencia}%</p>
      <p>Generado: {kwh} kWh</p>

      <button onClick={() => setKwh(kwh + 10)}>
        Generar energía
      </button>
    </article>
  );
}
```

Qué pasa al hacer clic:

```txt
1. El usuario pulsa el botón.
2. Se ejecuta setKwh(kwh + 10).
3. React cambia el valor.
4. React vuelve a pintar el componente.
```

Regla:

```txt
Si uso useState, onClick o useEffect, pongo "use client" arriba.
```

### 2.5 `useEffect`

`useEffect` ejecuta código después de cargar la pantalla. En el Manual 1 se usa para pedir el clima.

```jsx
"use client";

import { useEffect, useState } from "react";

export default function Clima() {
  const [temperatura, setTemperatura] = useState("Cargando...");

  useEffect(() => {
    async function cargarClima() {
      const respuesta = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=42.85&longitude=-2.67&current=temperature_2m"
      );
      const datos = await respuesta.json();
      setTemperatura(datos.current.temperature_2m);
    }

    cargarClima();
  }, []);

  return <p>Temperatura: {temperatura}</p>;
}
```

El `[]` del final significa:

```txt
Haz esto solo una vez cuando el componente aparezca.
```

Importante: si la API necesita una clave secreta, no la llames desde el cliente. El navegador puede ver el código. Para secretos, mejor servidor.

---

## 3. Manual 2 explicado muy simple

El Manual 2 convierte una pantalla en una app con varias páginas.

### 3.1 Rutas

En Next.js App Router, las carpetas crean rutas.

```txt
app/page.js              -> /
app/produccion/page.js   -> /produccion
app/logistica/page.js    -> /logistica
app/seguridad/page.js    -> /seguridad
```

Cada carpeta con `page.js` es una página.

### 3.2 Layout

`layout.js` es una plantilla compartida.

```jsx
// app/layout.js
import Link from "next/link";
import "./globals.css";

export const metadata = {
  title: "H2 Vitoria",
  description: "Panel de hidrógeno",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <nav>
          <Link href="/">Inicio</Link>
          <Link href="/linea-h2">Línea H2</Link>
          <Link href="/seguridad">Seguridad</Link>
        </nav>

        {children}
      </body>
    </html>
  );
}
```

`children` significa:

```txt
Aquí se coloca la página actual.
```

Si estoy en `/linea-h2`, `children` será `app/linea-h2/page.js`.

### 3.3 `Link`

Para moverte entre páginas, usa `Link`.

```jsx
import Link from "next/link";

export default function Page() {
  return <Link href="/linea-h2">Ir a línea H2</Link>;
}
```

No uses un `<button>` normal para navegar. El botón sirve para acciones. `Link` sirve para rutas.

### 3.4 `.map()`

`.map()` convierte una lista de datos en elementos de pantalla.

```jsx
const piezas = [
  { id: 1, nombre: "Motor", stock: 12 },
  { id: 2, nombre: "Batería", stock: 8 },
];

export default function LogisticaPage() {
  return (
    <ul>
      {piezas.map((pieza) => (
        <li key={pieza.id}>
          {pieza.nombre}: {pieza.stock}
        </li>
      ))}
    </ul>
  );
}
```

Regla:

```txt
Siempre que hago map en React, pongo key.
Normalmente key={item.id}.
```

### 3.5 `next/image`

Para imágenes locales:

```jsx
import Image from "next/image";
import planta from "@/public/planta.jpg";

export default function Page() {
  return <Image src={planta} alt="Planta industrial" priority />;
}
```

Para imágenes externas:

```jsx
import Image from "next/image";

export default function Hero() {
  return (
    <div className="relative h-64">
      <Image
        src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23"
        alt="Planta"
        fill
        sizes="100vw"
        className="object-cover"
      />
    </div>
  );
}
```

Si la imagen externa no carga:

```txt
1. Mira el dominio de la imagen: images.unsplash.com.
2. Añádelo a next.config.mjs.
3. Reinicia npm run dev.
```

Ejemplo de `next.config.mjs`:

```js
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
```

---

## 4. Manual 3 en una frase práctica

El Manual 3 enseña una regla importante:

```txt
Server Component:
  trae datos y usa secretos.

Client Component:
  tiene botones, useState, useEffect y cosas interactivas.
```

Por defecto, una página de `app/` es Server Component.

```jsx
// app/page.jsx
export default async function Page() {
  const datos = await cargarDatos();

  return <main>{datos.nombre}</main>;
}
```

Un componente interactivo necesita `"use client"`.

```jsx
"use client";

import { useState } from "react";

export default function Contador() {
  const [valor, setValor] = useState(0);

  return <button onClick={() => setValor(valor + 1)}>{valor}</button>;
}
```

Frase de examen:

```txt
Intento dejar la página en servidor y solo paso a cliente los componentes que necesitan interacción.
```

También aparece la idea de ruta dinámica:

```txt
app/coches/[vin]/page.jsx -> /coches/123ABC
```

`[vin]` significa: esta parte de la URL cambia.

```jsx
export default function CochePage({ params }) {
  return <h1>Coche con VIN: {params.vin}</h1>;
}
```

## 4.1 Manual 4 en una frase práctica

El Manual 4 explica Zustand. No lo necesitas para todo.

```txt
useState:
  estado pequeño dentro de un componente.

Zustand:
  estado compartido por muchas partes de la app.
```

Ejemplo:

```txt
Contador de un tanque -> useState.
Carrito de compra visible en varias páginas -> Zustand.
Usuario conectado -> normalmente Supabase Auth, no Zustand.
```

Regla de examen:

```txt
Si el dato solo lo usa un componente, useState.
Si el dato lo necesitan muchas pantallas, estado global.
Si el dato debe guardarse para siempre, base de datos.
```

---

## 5. Base de datos explicado desde cero

Una base de datos guarda información en tablas.

```txt
Tabla: libros

id | titulo       | autor
1  | El Quijote   | Cervantes
2  | Frankenstein | Mary Shelley
```

Cada tabla tiene:

- columnas: `id`, `titulo`, `autor`
- filas: cada libro concreto
- tipos: texto, número, booleano, fecha, uuid

### 5.1 Tipos importantes

| En JavaScript | En PostgreSQL | Uso |
|---|---|---|
| string | text | nombres, emails, títulos |
| number entero | int | stock, edad, cantidad |
| number decimal | numeric | precios, dinero |
| boolean | boolean | activo, pagado, completado |
| Date/string fecha | timestamptz | fecha de creación, reserva |
| string id | uuid | identificadores seguros |

### 5.2 Primary Key

La primary key identifica una fila.

```sql
id uuid default gen_random_uuid() primary key
```

Frase de examen:

```txt
Sin primary key no puedo distinguir dos filas parecidas.
```

### 5.3 Foreign Key

La foreign key conecta una tabla con otra.

```sql
create table autores (
  id uuid default gen_random_uuid() primary key,
  nombre text not null
);

create table libros (
  id uuid default gen_random_uuid() primary key,
  autor_id uuid references autores(id),
  titulo text not null
);
```

Relación:

```txt
Un autor tiene muchos libros.
autores 1 -> N libros.
La foreign key va en libros: autor_id.
```

### 5.4 CRUD

CRUD son las cuatro operaciones básicas.

```sql
-- Read
select * from libros;

-- Create
insert into libros (titulo) values ('El Quijote');

-- Update
update libros set titulo = 'Don Quijote' where id = '...';

-- Delete
delete from libros where id = '...';
```

Regla de oro:

```txt
UPDATE y DELETE casi siempre llevan WHERE.
Sin WHERE puedes cambiar o borrar toda la tabla.
```

---

## 6. Cómo conectar Supabase a Next.js

### 6.1 Instalar

App sencilla:

```bash
npm install @supabase/supabase-js
```

App con login SSR:

```bash
npm install @supabase/supabase-js @supabase/ssr
```

Supabase recomienda actualmente publishable keys para proyectos nuevos, aunque tus manuales usan `anon key`. Para clase, usa lo que esté usando tu proyecto.

### 6.2 Variables

`.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_publica
```

La clave `anon` o `publishable` puede estar en el navegador. La `service_role` o secret key nunca.

### 6.3 Cliente sencillo

```js
// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### 6.4 Leer datos

```jsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LibrosPage() {
  const [libros, setLibros] = useState([]);

  useEffect(() => {
    async function cargarLibros() {
      const { data, error } = await supabase
        .from("libros")
        .select("*")
        .order("titulo");

      if (error) {
        console.error(error);
        return;
      }

      setLibros(data);
    }

    cargarLibros();
  }, []);

  return (
    <main>
      <h1>Libros</h1>

      {libros.map((libro) => (
        <p key={libro.id}>{libro.titulo}</p>
      ))}
    </main>
  );
}
```

Orden mental:

```txt
1. Estado vacío: []
2. useEffect al cargar.
3. supabase.from("libros").select("*")
4. setLibros(data)
5. map para pintar.
```

### 6.5 Insertar datos

```jsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NuevoLibro() {
  const [titulo, setTitulo] = useState("");

  async function crearLibro(event) {
    event.preventDefault();

    const { error } = await supabase
      .from("libros")
      .insert([{ titulo }]);

    if (error) {
      alert(error.message);
      return;
    }

    setTitulo("");
  }

  return (
    <form onSubmit={crearLibro}>
      <input
        value={titulo}
        onChange={(event) => setTitulo(event.target.value)}
        placeholder="Título"
      />
      <button type="submit">Guardar</button>
    </form>
  );
}
```

Traducción:

```txt
El input guarda lo que escribo en titulo.
Al enviar, insert crea una fila.
Después limpio el input.
```

---

## 7. Login y register explicado fácil

El Manual Login/Register tiene una idea central:

```txt
Hay código que corre en el navegador.
Hay código que corre en el servidor.
Supabase Auth necesita los dos.
```

### 7.1 Cliente de navegador

Se usa en formularios y botones.

```js
// utils/supabase/client.js
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

Usos:

- login con email
- register
- login con Google/GitHub
- botones interactivos

### 7.2 Cliente de servidor

Se usa para proteger páginas y leer cookies.

```js
// utils/supabase/server.js
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // En algunos Server Components solo se pueden leer cookies.
          }
        },
      },
    }
  );
}
```

Frase sencilla:

```txt
client.js habla desde el navegador.
server.js habla desde el servidor y entiende las cookies.
```

### 7.3 Login con email

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function login(event) {
    event.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={login}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Entrar</button>
    </form>
  );
}
```

`router.refresh()` ayuda a que el servidor lea las cookies nuevas después del login.

### 7.4 Register

```js
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${window.location.origin}/auth/callback`,
  },
});
```

Supabase hace:

```txt
1. Crea el usuario en auth.users.
2. Cifra la contraseña.
3. Puede mandar email de confirmación.
```

### 7.5 Proteger página privada

```jsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <h1>Zona privada</h1>;
}
```

Nota actual: la documentación de Supabase recomienda `getClaims()` para proteger páginas en servidor porque valida el token. En clase puedes ver `getUser()`. La idea de examen es la misma: la protección real no debe depender solo del frontend.

---

## 8. RLS explicado fácil

RLS significa Row Level Security.

Traducción:

```txt
Seguridad por fila.
```

Sin RLS:

```txt
Un usuario podría intentar leer datos de otros.
```

Con RLS:

```txt
PostgreSQL revisa cada fila antes de devolverla.
```

### 8.1 Tabla con dueño

```sql
create table tareas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null,
  completada boolean not null default false,
  created_at timestamptz not null default now()
);

alter table tareas enable row level security;
```

`user_id` guarda de quién es la tarea.

### 8.2 Políticas básicas

```sql
create policy "usuario ve sus tareas"
on tareas for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "usuario crea sus tareas"
on tareas for insert
to authenticated
with check ((select auth.uid()) = user_id);
```

Traducción:

```txt
SELECT:
  enseña la fila si user_id es mi usuario.

INSERT:
  deja crear la fila solo si user_id soy yo.
```

### 8.3 `USING` vs `WITH CHECK`

| Cláusula | Pregunta que responde |
|---|---|
| `USING` | ¿Qué filas existentes puede ver/tocar? |
| `WITH CHECK` | ¿Qué datos nuevos puede guardar? |

Regla rápida:

```txt
SELECT usa USING.
DELETE usa USING.
INSERT usa WITH CHECK.
UPDATE suele usar USING y WITH CHECK.
```

---

## 9. Ejemplo 1: app local sin base de datos

Este ejemplo sale del Manual 1.

### Enunciado

Crea una app de energía solar con tres bloques. Cada bloque tiene nombre, eficiencia y un botón que suma 10 kWh.

### Archivos

```txt
app/page.js
app/components/BloqueSolar.jsx
```

### `app/components/BloqueSolar.jsx`

```jsx
"use client";

import { useState } from "react";

export default function BloqueSolar({ nombre, eficiencia }) {
  const [kwh, setKwh] = useState(0);
  const productivo = kwh >= 100;

  return (
    <article className="border p-4">
      <h2>{nombre}</h2>
      <p>Eficiencia: {eficiencia}%</p>
      <p className={productivo ? "text-yellow-600" : "text-gray-700"}>
        {kwh} kWh
      </p>
      <button onClick={() => setKwh(kwh + 10)}>
        Generar energía
      </button>
    </article>
  );
}
```

### `app/page.js`

```jsx
import BloqueSolar from "./components/BloqueSolar";

export default function Page() {
  return (
    <main>
      <h1>Panel Vitoria-Sun</h1>
      <BloqueSolar nombre="Sector Norte" eficiencia={95} />
      <BloqueSolar nombre="Sector Sur" eficiencia={88} />
      <BloqueSolar nombre="Sector Este" eficiencia={91} />
    </main>
  );
}
```

Qué estás demostrando:

- componentes
- props
- state
- condicional visual
- `"use client"`

---

## 10. Ejemplo 2: la misma app con base de datos

Ahora los bloques solares no están escritos a mano. Vienen de Supabase.

### 10.1 Tabla

```sql
create table bloques_solares (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  eficiencia int not null check (eficiencia between 0 and 100),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
```

Datos de prueba:

```sql
insert into bloques_solares (nombre, eficiencia) values
  ('Sector Norte', 95),
  ('Sector Sur', 88),
  ('Sector Este', 91);
```

Para poder leerlos sin login:

```sql
alter table bloques_solares enable row level security;

create policy "lectura publica bloques"
on bloques_solares for select
to anon, authenticated
using (true);
```

### 10.2 Página

```jsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import BloqueSolar from "./components/BloqueSolar";

export default function Page() {
  const [bloques, setBloques] = useState([]);

  useEffect(() => {
    async function cargarBloques() {
      const { data, error } = await supabase
        .from("bloques_solares")
        .select("*")
        .eq("activo", true)
        .order("nombre");

      if (error) {
        console.error(error);
        return;
      }

      setBloques(data);
    }

    cargarBloques();
  }, []);

  return (
    <main>
      <h1>Panel Vitoria-Sun</h1>

      {bloques.map((bloque) => (
        <BloqueSolar
          key={bloque.id}
          nombre={bloque.nombre}
          eficiencia={bloque.eficiencia}
        />
      ))}
    </main>
  );
}
```

Qué cambia respecto al ejemplo 1:

```txt
Antes:
  Los datos estaban escritos en JSX.

Ahora:
  Los datos viven en PostgreSQL.
  Next los pide con Supabase.
  React los pinta con map.
```

---

## 11. Ejemplo 3: H2-Vitoria con rutas

Este ejemplo sale del Manual 2.

### Enunciado

Crear una app con tres páginas:

- `/`: inicio
- `/linea-h2`: tanques con presión
- `/seguridad`: protocolos

### Archivos

```txt
app/layout.js
app/page.js
app/linea-h2/page.js
app/linea-h2/TanqueH2.jsx
app/seguridad/page.js
```

### `app/layout.js`

```jsx
import Link from "next/link";
import "./globals.css";

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <nav>
          <Link href="/">Inicio</Link>
          <Link href="/linea-h2">Línea H2</Link>
          <Link href="/seguridad">Seguridad</Link>
        </nav>
        {children}
      </body>
    </html>
  );
}
```

### `app/linea-h2/TanqueH2.jsx`

```jsx
"use client";

import { useState } from "react";

export default function TanqueH2({ nombre }) {
  const [presion, setPresion] = useState(0);
  const peligro = presion > 700;

  return (
    <article>
      <h2>{nombre}</h2>
      <p className={peligro ? "text-red-600" : "text-green-700"}>
        Presión: {presion} bares
      </p>
      <button onClick={() => setPresion(presion + 50)}>
        Aumentar presión
      </button>
    </article>
  );
}
```

### `app/linea-h2/page.js`

```jsx
import TanqueH2 from "./TanqueH2";

export default function LineaH2Page() {
  return (
    <main>
      <h1>Línea H2</h1>
      <TanqueH2 nombre="Tanque Alfa" />
      <TanqueH2 nombre="Tanque Beta" />
    </main>
  );
}
```

Qué estás demostrando:

- rutas
- layout
- navegación con `Link`
- componente cliente dentro de una página
- props y state

---

## 12. Ejemplo 4: H2-Vitoria con login y RLS

Ahora cada usuario guarda sus mediciones.

### 12.1 Tablas

```sql
create table tanques_h2 (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  presion_maxima int not null default 700
);

create table mediciones_h2 (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tanque_id uuid not null references tanques_h2(id) on delete cascade,
  presion int not null check (presion >= 0),
  created_at timestamptz not null default now()
);
```

Relaciones:

```txt
auth.users 1 -> N mediciones_h2
tanques_h2 1 -> N mediciones_h2
```

### 12.2 RLS

```sql
alter table mediciones_h2 enable row level security;

create policy "usuario ve sus mediciones"
on mediciones_h2 for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "usuario crea sus mediciones"
on mediciones_h2 for insert
to authenticated
with check ((select auth.uid()) = user_id);
```

### 12.3 Insertar medición desde el cliente

```jsx
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function TanqueH2({ tanque }) {
  const [presion, setPresion] = useState(0);
  const supabase = createClient();

  async function guardarMedicion() {
    const nuevaPresion = presion + 50;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Debes iniciar sesión");
      return;
    }

    const { error } = await supabase.from("mediciones_h2").insert([
      {
        user_id: user.id,
        tanque_id: tanque.id,
        presion: nuevaPresion,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setPresion(nuevaPresion);
  }

  return (
    <article>
      <h2>{tanque.nombre}</h2>
      <p>{presion} bares</p>
      <button onClick={guardarMedicion}>Guardar medición</button>
    </article>
  );
}
```

Qué debes explicar:

```txt
El usuario hace clic.
Primero compruebo quién es.
Luego inserto una medición con user_id.
RLS comprueba que user_id coincide con auth.uid().
Si intenta guardar como otro usuario, falla.
```

---

## 13. Ejercicios resueltos de base de datos

### 13.1 Netflix

Enunciado:

```txt
Usuario ve películas y las valora.
```

Tablas:

```txt
usuarios:
  id, nombre, email, fecha_suscripcion

peliculas:
  id, titulo, duracion, genero

valoraciones:
  id, usuario_id, pelicula_id, puntuacion
```

Relaciones:

```txt
usuarios 1 -> N valoraciones
peliculas 1 -> N valoraciones
```

Por qué existe `valoraciones`:

```txt
Porque un usuario puede valorar muchas películas
y una película puede tener valoraciones de muchos usuarios.
Eso es N:N, se resuelve con tabla intermedia.
```

### 13.2 Biblioteca

Enunciado:

```txt
Una biblioteca tiene libros y ejemplares físicos.
Puede tener 5 copias del mismo libro.
```

Tablas:

```txt
libros:
  id, titulo, autor

ejemplares:
  id, libro_id, codigo_barras, estado
```

Relación:

```txt
libros 1 -> N ejemplares
La FK va en ejemplares: libro_id.
```

### 13.3 Tienda de ropa

Enunciado:

```txt
Un producto tiene tallas y colores.
Cada talla/color tiene stock y precio.
```

Tablas:

```txt
productos:
  id, nombre, descripcion, categoria

variantes:
  id, producto_id, color, talla, stock, precio
```

Relación:

```txt
productos 1 -> N variantes
```

Por qué es mejor:

```txt
Si cambia el nombre del producto, lo cambio una vez.
No lo repito en cada talla/color.
```

---

## 14. Cómo resolver cualquier enunciado

Cuando te den un ejercicio, rellena esto en papel:

```txt
1. Nombre de la app:

2. Rutas:
   /
   /...

3. Componentes:
   Componente 1:
     props:
     state:

4. Tablas:
   tabla_1:
     columnas:
     primary key:
     foreign keys:

5. Relaciones:
   A 1 -> N B
   A N -> N B mediante tabla_intermedia

6. Operaciones:
   ¿Leo datos? select
   ¿Creo datos? insert
   ¿Edito datos? update
   ¿Borro datos? delete

7. Login:
   ¿Hay zona privada?
   ¿Qué rutas protege?

8. RLS:
   ¿Cada usuario ve solo lo suyo?
   ¿Qué columna guarda el dueño? user_id, autor_id, cliente_id...
```

Este esquema te evita quedarte en blanco.

---

## 15. Preguntas cortas de examen

### ¿Qué es un componente?

Una pieza reutilizable de interfaz.

### ¿Qué son props?

Datos que un componente recibe desde fuera.

### ¿Qué es state?

Memoria interna de un componente. Cuando cambia, React repinta.

### ¿Cuándo pongo `"use client"`?

Cuando uso `useState`, `useEffect`, `onClick`, formularios interactivos o APIs del navegador.

### ¿Qué es `layout.js`?

Una plantilla común que envuelve páginas. Recibe `children`.

### ¿Qué es una primary key?

Un identificador único para cada fila.

### ¿Qué es una foreign key?

Una columna que apunta al `id` de otra tabla.

### ¿Qué es RLS?

Seguridad a nivel de fila. La base de datos decide qué filas puede ver o modificar cada usuario.

### ¿Diferencia entre `USING` y `WITH CHECK`?

`USING` filtra filas existentes. `WITH CHECK` valida datos nuevos.

### ¿Por qué no expongo `service_role`?

Porque ignora RLS y tendría permisos totales sobre la base de datos.

---

## 16. Checklist final antes del examen

- Sé crear una página en `app/page.js`.
- Sé crear rutas con carpetas.
- Sé usar `layout.js` y `children`.
- Sé usar `Link`.
- Sé crear componentes con props.
- Sé usar `useState`.
- Sé usar `useEffect`.
- Sé hacer `.map()` con `key`.
- Sé diseñar tablas con `id`.
- Sé elegir tipos: `text`, `int`, `numeric`, `boolean`, `timestamptz`, `uuid`.
- Sé poner una foreign key en el lado muchos.
- Sé escribir `select`, `insert`, `update`, `delete`.
- Sé conectar Supabase con `.env.local`.
- Sé leer datos con `.select()`.
- Sé crear datos con `.insert()`.
- Sé explicar client/server en Supabase Auth.
- Sé proteger una página privada.
- Sé activar RLS.
- Sé escribir una política básica con `auth.uid()`.

---

## 17. Orden recomendado de estudio

1. Lee secciones 2 y 3 de esta guía.
2. Haz el ejemplo 1 sin mirar.
3. Lee secciones 5 y 6.
4. Haz el ejemplo 2.
5. Lee secciones 7 y 8.
6. Haz el ejemplo 4 despacio.
7. Repasa las preguntas cortas.
8. Intenta explicar en voz alta el apartado 14.

---

## Navegación

| | | |
|---|---|---|
| [Teoría PostgreSQL](./teoria/01-teoria.md) | [Teoría RLS](./teoria/02-teoria.md) | [Ejemplos prácticos ejecutables](./07-ejemplos-practicos-ejecutables.md) |
