# 07 — Ejemplos prácticos ejecutables: Next.js + Supabase

> Objetivo: tener ejemplos con comandos, librerías, estructura de archivos y código para practicar lo que aparece en los manuales.

---

## 0. Qué vas a construir

Vamos a crear un solo proyecto llamado `next-examen-lab` con varias rutas:

```txt
/                    -> portada con navegación
/energia             -> Manual 1: componentes, props, useState, useEffect
/h2                  -> Manual 2: layout, rutas, Link, Image
/placas              -> Manual 3: Server Component, ruta dinámica, Client Component
/fabrica             -> Manual 4: Zustand
/biblioteca          -> Base de datos: Supabase CRUD
/login               -> Login/Register: Supabase Auth
/dashboard           -> Página privada
```

La idea es que cada ruta practique una parte concreta del examen.

---

## 1. Crear el proyecto

### 1.1 Comando inicial

```bash
npx create-next-app@latest next-examen-lab
```

Opciones recomendadas cuando pregunte:

```txt
TypeScript? No
ESLint? Yes
Tailwind CSS? Yes
src/ directory? No
App Router? Yes
Turbopack? Yes
Import alias? Yes
Alias: @/*
```

Entrar y arrancar:

```bash
cd next-examen-lab
npm run dev
```

Abre:

```txt
http://localhost:3000
```

### 1.2 Librerías que usaremos

```bash
npm install @supabase/supabase-js @supabase/ssr zustand lucide-react
npx shadcn@latest init
npx shadcn@latest add button card input label
```

Para qué sirve cada una:

| Librería | Para qué |
|---|---|
| `@supabase/supabase-js` | Hablar con la base de datos y Auth |
| `@supabase/ssr` | Usar Supabase Auth con cookies en Next.js |
| `zustand` | Estado global |
| `lucide-react` | Iconos |
| `shadcn` | Componentes UI como Button, Card, Input, Label |

---

## 2. Limpieza inicial

Deja `app/globals.css` con Tailwind normal. No hace falta complicarlo.

Archivo `app/page.js`:

```jsx
import Link from "next/link";

const rutas = [
  { href: "/energia", label: "Energía: props, state y effect" },
  { href: "/h2", label: "H2: rutas, layout e imagen" },
  { href: "/placas", label: "Placas: server/client y rutas dinámicas" },
  { href: "/fabrica", label: "Fábrica: Zustand" },
  { href: "/biblioteca", label: "Biblioteca: Supabase CRUD" },
  { href: "/login", label: "Login/Register" },
  { href: "/dashboard", label: "Dashboard privado" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Next Examen Lab
      </h1>
      <p className="mt-2 text-slate-600">
        Prácticas ordenadas por manual.
      </p>

      <section className="mt-8 grid gap-3">
        {rutas.map((ruta) => (
          <Link
            key={ruta.href}
            href={ruta.href}
            className="rounded border bg-white p-4 font-medium text-slate-800 hover:bg-slate-50"
          >
            {ruta.label}
          </Link>
        ))}
      </section>
    </main>
  );
}
```

---

## 3. Ejemplo 1: Energía Vitoria

Practica:

```txt
Manual 1:
- JSX
- componentes
- props
- useState
- useEffect
```

### 3.1 Crear archivos

```txt
app/energia/page.js
app/energia/BloqueSolar.jsx
app/energia/ClimaVitoria.jsx
```

### 3.2 `app/energia/BloqueSolar.jsx`

```jsx
"use client";

import { useState } from "react";

export default function BloqueSolar({ nombre, eficiencia }) {
  const [kwh, setKwh] = useState(0);
  const productivo = kwh >= 100;

  return (
    <article className="rounded border bg-white p-4 shadow-sm">
      <h2 className="text-xl font-bold text-slate-900">{nombre}</h2>
      <p className="text-sm text-slate-600">Eficiencia: {eficiencia}%</p>

      <p className={productivo ? "mt-4 font-bold text-amber-600" : "mt-4 font-bold text-slate-800"}>
        {kwh} kWh generados
      </p>

      <button
        onClick={() => setKwh(kwh + 10)}
        className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white"
      >
        Generar energía
      </button>
    </article>
  );
}
```

Qué estás practicando:

```txt
nombre y eficiencia -> props
kwh -> state
setKwh -> actualiza state
productivo -> lógica condicional
```

### 3.3 `app/energia/ClimaVitoria.jsx`

Usamos Open-Meteo porque no necesita API key.

```jsx
"use client";

import { useEffect, useState } from "react";

export default function ClimaVitoria() {
  const [temperatura, setTemperatura] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function cargarClima() {
      try {
        const respuesta = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=42.85&longitude=-2.67&current=temperature_2m"
        );
        const datos = await respuesta.json();
        setTemperatura(datos.current.temperature_2m);
      } catch {
        setError("No se pudo cargar el clima");
      }
    }

    cargarClima();
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (temperatura === null) return <p>Cargando clima...</p>;

  return <p>Temperatura actual en Vitoria: {temperatura} ºC</p>;
}
```

### 3.4 `app/energia/page.js`

```jsx
import BloqueSolar from "./BloqueSolar";
import ClimaVitoria from "./ClimaVitoria";

export default function EnergiaPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold text-slate-900">
        Panel Vitoria-Sun
      </h1>

      <section className="mt-4 rounded border bg-white p-4">
        <ClimaVitoria />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <BloqueSolar nombre="Sector Norte" eficiencia={95} />
        <BloqueSolar nombre="Sector Sur" eficiencia={88} />
        <BloqueSolar nombre="Sector Este" eficiencia={91} />
      </section>
    </main>
  );
}
```

Prueba:

```bash
npm run dev
```

Abre:

```txt
http://localhost:3000/energia
```

---

## 4. Ejemplo 2: H2 Vitoria

Practica:

```txt
Manual 2:
- rutas
- layout
- Link
- next/image
- componente con state
```

### 4.1 Configurar imagen externa

Archivo `next.config.mjs`:

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

Después de cambiar este archivo, reinicia:

```bash
npm run dev
```

### 4.2 Crear archivos

```txt
app/h2/page.js
app/h2/TanqueH2.jsx
app/h2/seguridad/page.js
```

### 4.3 `app/h2/TanqueH2.jsx`

```jsx
"use client";

import { useState } from "react";

export default function TanqueH2({ nombre }) {
  const [presion, setPresion] = useState(0);
  const peligro = presion > 700;

  return (
    <article className="rounded border bg-white p-4">
      <h2 className="text-xl font-bold">{nombre}</h2>
      <p className={peligro ? "mt-3 font-bold text-red-600" : "mt-3 font-bold text-emerald-700"}>
        Presión: {presion} bares
      </p>
      <button
        onClick={() => setPresion(presion + 50)}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
      >
        Aumentar presión
      </button>
    </article>
  );
}
```

### 4.4 `app/h2/page.js`

```jsx
import Image from "next/image";
import Link from "next/link";
import TanqueH2 from "./TanqueH2";

export default function H2Page() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">H2 Vitoria</h1>
          <p className="text-slate-600">Gestión de hidrógeno</p>
        </div>
        <Link href="/h2/seguridad" className="rounded bg-blue-600 px-4 py-2 text-white">
          Seguridad
        </Link>
      </header>

      <section className="relative mt-6 h-64 overflow-hidden rounded">
        <Image
          src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23"
          alt="Planta industrial"
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <TanqueH2 nombre="Tanque Alfa" />
        <TanqueH2 nombre="Tanque Beta" />
      </section>
    </main>
  );
}
```

### 4.5 `app/h2/seguridad/page.js`

```jsx
import Link from "next/link";

export default function SeguridadPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <Link href="/h2" className="text-blue-700 underline">
        Volver a H2
      </Link>

      <h1 className="mt-4 text-3xl font-bold">Protocolos de seguridad</h1>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded border bg-white p-4">
          <h2 className="font-bold">Inspección</h2>
          <p className="text-sm text-slate-600">Equipos revisados cada turno.</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="font-bold">Nivel de alerta</h2>
          <p className="text-sm text-green-700">Normal</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="font-bold">Ventilación</h2>
          <p className="text-sm text-slate-600">Activa en zona de pruebas.</p>
        </article>
      </section>
    </main>
  );
}
```

Prueba:

```txt
http://localhost:3000/h2
http://localhost:3000/h2/seguridad
```

---

## 5. Ejemplo 3: SolarControl con Server Component y ruta dinámica

Practica:

```txt
Manual 3:
- datos en lib
- Server Component por defecto
- Client Component para interacción
- ruta dinámica [id]
- Server Action
```

### 5.1 Crear archivos

```txt
lib/placas.js
app/placas/page.js
app/placas/[id]/page.js
app/placas/[id]/TestInclinacion.jsx
app/placas/actions.js
```

### 5.2 `lib/placas.js`

```js
export const placas = [
  {
    id: "norte-01",
    nombre: "Placa Norte 01",
    potencia: 420,
    inclinacion: 30,
  },
  {
    id: "sur-02",
    nombre: "Placa Sur 02",
    potencia: 390,
    inclinacion: 25,
  },
  {
    id: "este-03",
    nombre: "Placa Este 03",
    potencia: 410,
    inclinacion: 28,
  },
];

export function getPlaca(id) {
  return placas.find((placa) => placa.id === id);
}
```

### 5.3 `app/placas/page.js`

```jsx
import Link from "next/link";
import { placas } from "@/lib/placas";

export default function PlacasPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold">SolarControl</h1>
      <p className="mt-2 text-slate-600">Listado de placas solares.</p>

      <section className="mt-6 grid gap-3">
        {placas.map((placa) => (
          <Link
            key={placa.id}
            href={`/placas/${placa.id}`}
            className="rounded border bg-white p-4 hover:bg-slate-50"
          >
            <h2 className="font-bold">{placa.nombre}</h2>
            <p>{placa.potencia} W</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
```

Esta página es Server Component porque no tiene `"use client"` y no usa hooks.

### 5.4 `app/placas/[id]/TestInclinacion.jsx`

```jsx
"use client";

import { useState } from "react";

export default function TestInclinacion({ inicial }) {
  const [inclinacion, setInclinacion] = useState(inicial);
  const correcta = inclinacion >= 25 && inclinacion <= 35;

  return (
    <section className="rounded border bg-white p-4">
      <h2 className="font-bold">Test de inclinación</h2>
      <p className={correcta ? "text-emerald-700" : "text-red-600"}>
        Inclinación actual: {inclinacion} grados
      </p>
      <button
        onClick={() => setInclinacion(inclinacion + 1)}
        className="mt-4 rounded bg-slate-900 px-4 py-2 text-white"
      >
        Subir inclinación
      </button>
    </section>
  );
}
```

### 5.5 `app/placas/actions.js`

```js
"use server";

export async function reportarLimpieza(formData) {
  const placaId = formData.get("placaId");
  const observaciones = formData.get("observaciones");

  console.log("Reporte de limpieza", {
    placaId,
    observaciones,
    fecha: new Date().toISOString(),
  });
}
```

### 5.6 `app/placas/[id]/page.js`

```jsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaca } from "@/lib/placas";
import TestInclinacion from "./TestInclinacion";
import { reportarLimpieza } from "../actions";

export default async function PlacaDetallePage({ params }) {
  const { id } = await params;
  const placa = getPlaca(id);

  if (!placa) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <Link href="/placas" className="text-blue-700 underline">
        Volver
      </Link>

      <h1 className="mt-4 text-3xl font-bold">{placa.nombre}</h1>
      <p>Potencia: {placa.potencia} W</p>

      <section className="mt-6">
        <TestInclinacion inicial={placa.inclinacion} />
      </section>

      <form action={reportarLimpieza} className="mt-6 rounded border bg-white p-4">
        <input type="hidden" name="placaId" value={placa.id} />
        <label className="block font-medium">Observaciones</label>
        <input
          name="observaciones"
          className="mt-2 w-full rounded border p-2"
          placeholder="Ej: polvo retirado"
        />
        <button className="mt-4 rounded bg-emerald-600 px-4 py-2 text-white">
          Enviar reporte
        </button>
      </form>
    </main>
  );
}
```

Prueba:

```txt
http://localhost:3000/placas
http://localhost:3000/placas/norte-01
```

---

## 6. Ejemplo 4: Fábrica con Zustand

Practica:

```txt
Manual 4:
- estado global
- store
- usar el mismo estado en varios componentes
```

### 6.1 Crear archivos

```txt
stores/factoryStore.js
app/fabrica/page.js
app/fabrica/MonitorMotores.jsx
app/fabrica/PanelProduccion.jsx
app/fabrica/ListaCoches.jsx
```

### 6.2 `stores/factoryStore.js`

```js
import { create } from "zustand";

export const useFactoryStore = create((set) => ({
  enginesInStock: 50,
  cars: [],

  useEngine: () =>
    set((state) => ({
      enginesInStock: Math.max(0, state.enginesInStock - 1),
    })),

  addCar: (modelName) =>
    set((state) => ({
      cars: [
        ...state.cars,
        {
          id: Date.now(),
          model: modelName,
        },
      ],
    })),
}));
```

### 6.3 `app/fabrica/MonitorMotores.jsx`

```jsx
"use client";

import { useFactoryStore } from "@/stores/factoryStore";

export default function MonitorMotores() {
  const engines = useFactoryStore((state) => state.enginesInStock);

  return (
    <article className="rounded border bg-white p-4">
      <h2 className="font-bold">Motores disponibles</h2>
      <p className="text-3xl font-bold">{engines}</p>
    </article>
  );
}
```

### 6.4 `app/fabrica/PanelProduccion.jsx`

```jsx
"use client";

import { useState } from "react";
import { useFactoryStore } from "@/stores/factoryStore";

export default function PanelProduccion() {
  const [model, setModel] = useState("");
  const addCar = useFactoryStore((state) => state.addCar);
  const useEngine = useFactoryStore((state) => state.useEngine);

  function producirCoche(event) {
    event.preventDefault();
    if (!model.trim()) return;

    useEngine();
    addCar(model);
    setModel("");
  }

  return (
    <form onSubmit={producirCoche} className="rounded border bg-white p-4">
      <h2 className="font-bold">Producción</h2>
      <input
        value={model}
        onChange={(event) => setModel(event.target.value)}
        className="mt-3 w-full rounded border p-2"
        placeholder="Modelo del coche"
      />
      <button className="mt-3 rounded bg-slate-900 px-4 py-2 text-white">
        Producir coche
      </button>
    </form>
  );
}
```

### 6.5 `app/fabrica/ListaCoches.jsx`

```jsx
"use client";

import { useFactoryStore } from "@/stores/factoryStore";

export default function ListaCoches() {
  const cars = useFactoryStore((state) => state.cars);

  return (
    <section className="rounded border bg-white p-4">
      <h2 className="font-bold">Coches producidos</h2>

      {cars.length === 0 ? (
        <p className="text-slate-600">Todavía no hay coches.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {cars.map((car) => (
            <li key={car.id} className="rounded bg-slate-100 p-2">
              {car.model}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

### 6.6 `app/fabrica/page.js`

```jsx
import MonitorMotores from "./MonitorMotores";
import PanelProduccion from "./PanelProduccion";
import ListaCoches from "./ListaCoches";

export default function FabricaPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold">Fábrica Zustand</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        <MonitorMotores />
        <PanelProduccion />
      </section>
      <section className="mt-4">
        <ListaCoches />
      </section>
    </main>
  );
}
```

Prueba:

```txt
http://localhost:3000/fabrica
```

Qué debes notar:

```txt
MonitorMotores y ListaCoches no son hijos directos del formulario,
pero todos leen el mismo store.
Eso es estado global.
```

---

## 7. Ejemplo 5: Biblioteca con Supabase CRUD

Practica:

```txt
Manual de Bases de datos:
- tabla
- tipos
- select
- insert
- update
- delete
- conexión Next.js + Supabase
```

### 7.1 Crear tabla en Supabase SQL Editor

```sql
create table libros (
  id uuid default gen_random_uuid() primary key,
  titulo text not null,
  autor text not null,
  stock int not null default 1 check (stock >= 0),
  created_at timestamptz not null default now()
);

alter table libros enable row level security;

create policy "lectura publica libros"
on libros for select
to anon, authenticated
using (true);

create policy "crear libros practica"
on libros for insert
to anon, authenticated
with check (true);

create policy "borrar libros practica"
on libros for delete
to anon, authenticated
using (true);

insert into libros (titulo, autor, stock) values
  ('El Quijote', 'Miguel de Cervantes', 3),
  ('Frankenstein', 'Mary Shelley', 2),
  ('La casa de Bernarda Alba', 'Federico García Lorca', 4);
```

Este ejemplo deja crear y borrar libros sin login para practicar CRUD rápido. Para una app real, exige login y usa políticas más estrictas.

### 7.2 Variables `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

En proyectos nuevos Supabase recomienda publishable key:

```bash
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Si usas publishable key, cambia también el nombre en el cliente.

### 7.3 `lib/supabase.js`

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

### 7.4 Crear archivos

```txt
app/biblioteca/page.js
app/biblioteca/NuevoLibroForm.jsx
```

### 7.5 `app/biblioteca/NuevoLibroForm.jsx`

```jsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function NuevoLibroForm({ onCreated }) {
  const [titulo, setTitulo] = useState("");
  const [autor, setAutor] = useState("");
  const [stock, setStock] = useState("1");
  const [loading, setLoading] = useState(false);

  async function crearLibro(event) {
    event.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from("libros")
      .insert([
        {
          titulo,
          autor,
          stock: Number(stock),
        },
      ])
      .select()
      .single();

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setTitulo("");
    setAutor("");
    setStock("1");
    onCreated(data);
  }

  return (
    <form onSubmit={crearLibro} className="rounded border bg-white p-4">
      <h2 className="font-bold">Nuevo libro</h2>

      <input
        value={titulo}
        onChange={(event) => setTitulo(event.target.value)}
        className="mt-3 w-full rounded border p-2"
        placeholder="Título"
        required
      />
      <input
        value={autor}
        onChange={(event) => setAutor(event.target.value)}
        className="mt-3 w-full rounded border p-2"
        placeholder="Autor"
        required
      />
      <input
        value={stock}
        onChange={(event) => setStock(event.target.value)}
        className="mt-3 w-full rounded border p-2"
        placeholder="Stock"
        type="number"
        min="0"
        required
      />

      <button
        disabled={loading}
        className="mt-3 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
```

### 7.6 `app/biblioteca/page.js`

```jsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import NuevoLibroForm from "./NuevoLibroForm";

export default function BibliotecaPage() {
  const [libros, setLibros] = useState([]);
  const [loading, setLoading] = useState(true);

  async function cargarLibros() {
    const { data, error } = await supabase
      .from("libros")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setLibros(data);
    }

    setLoading(false);
  }

  useEffect(() => {
    cargarLibros();
  }, []);

  async function borrarLibro(id) {
    const { error } = await supabase.from("libros").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setLibros((actuales) => actuales.filter((libro) => libro.id !== id));
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold">Biblioteca</h1>

      <section className="mt-6">
        <NuevoLibroForm onCreated={(libro) => setLibros([libro, ...libros])} />
      </section>

      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="font-bold">Libros</h2>

        {loading ? (
          <p>Cargando...</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {libros.map((libro) => (
              <li
                key={libro.id}
                className="flex items-center justify-between rounded bg-slate-100 p-3"
              >
                <span>
                  <strong>{libro.titulo}</strong> — {libro.autor} ({libro.stock})
                </span>
                <button
                  onClick={() => borrarLibro(libro.id)}
                  className="rounded bg-red-600 px-3 py-1 text-white"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

Si el borrado falla, revisa que hayas ejecutado la política `borrar libros practica`.

---

## 8. Ejemplo 6: Login, Register y dashboard privado

Practica:

```txt
Manual Login/Register:
- @supabase/ssr
- client.js
- server.js
- signInWithPassword
- signUp
- logout
- página protegida
```

### 8.1 Crear clientes Supabase SSR

Archivos:

```txt
utils/supabase/client.js
utils/supabase/server.js
```

### 8.2 `utils/supabase/client.js`

```js
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
```

### 8.3 `utils/supabase/server.js`

```js
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

### 8.4 Login

Archivo `app/login/page.jsx`:

```jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function login(event) {
    event.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-8">
      <form onSubmit={login} className="w-full max-w-sm rounded border bg-white p-6">
        <h1 className="text-2xl font-bold">Login</h1>

        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-4 w-full rounded border p-2"
          placeholder="Email"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-3 w-full rounded border p-2"
          placeholder="Contraseña"
          type="password"
          required
        />

        <button
          disabled={loading}
          className="mt-4 w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </main>
  );
}
```

### 8.5 Register

Archivo `app/register/page.jsx`:

```jsx
"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const supabase = createClient();

  async function register(event) {
    event.preventDefault();

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Revisa tu correo o entra si la confirmación está desactivada.");
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-8">
      <form onSubmit={register} className="w-full max-w-sm rounded border bg-white p-6">
        <h1 className="text-2xl font-bold">Register</h1>

        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-4 w-full rounded border p-2"
          placeholder="Email"
          type="email"
          required
        />
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-3 w-full rounded border p-2"
          placeholder="Contraseña"
          type="password"
          required
        />

        <button className="mt-4 w-full rounded bg-emerald-600 px-4 py-2 text-white">
          Crear cuenta
        </button>

        {message && <p className="mt-3 text-sm text-slate-700">{message}</p>}
      </form>
    </main>
  );
}
```

### 8.6 Callback OAuth

Archivo `app/auth/callback/route.js`:

```js
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-failed`);
}
```

### 8.7 Dashboard privado

Archivo `app/dashboard/page.jsx`:

```jsx
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import LogoutButton from "./LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold">Dashboard privado</h1>
      <p className="mt-2">Usuario: {user.email}</p>
      <div className="mt-6">
        <LogoutButton />
      </div>
    </main>
  );
}
```

Archivo `app/dashboard/LogoutButton.jsx`:

```jsx
"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button onClick={logout} className="rounded bg-red-600 px-4 py-2 text-white">
      Salir
    </button>
  );
}
```

Nota actual: Supabase recomienda `getClaims()` para proteger datos sensibles en servidor. En los manuales verás mucho `getUser()`, que sigue siendo una forma clara para aprender el flujo.

---

## 9. Ejemplo 7: préstamos con usuario y RLS

Este ejemplo une base de datos + login + RLS.

### 9.1 SQL

```sql
create table prestamos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  libro_id uuid not null references libros(id) on delete cascade,
  fecha_prestamo timestamptz not null default now()
);

alter table prestamos enable row level security;

create policy "usuario ve sus prestamos"
on prestamos for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "usuario crea sus prestamos"
on prestamos for insert
to authenticated
with check ((select auth.uid()) = user_id);
```

### 9.2 Archivo `app/prestamos/page.jsx`

```jsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function PrestamosPage() {
  const [libros, setLibros] = useState([]);
  const [prestamos, setPrestamos] = useState([]);
  const supabase = createClient();

  useEffect(() => {
    async function cargarDatos() {
      const { data: librosData } = await supabase.from("libros").select("*");
      const { data: prestamosData } = await supabase
        .from("prestamos")
        .select("id, fecha_prestamo, libros(titulo)");

      setLibros(librosData ?? []);
      setPrestamos(prestamosData ?? []);
    }

    cargarDatos();
  }, []);

  async function crearPrestamo(libroId) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Inicia sesión primero");
      return;
    }

    const { data, error } = await supabase
      .from("prestamos")
      .insert([
        {
          user_id: user.id,
          libro_id: libroId,
        },
      ])
      .select("id, fecha_prestamo, libros(titulo)")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setPrestamos([data, ...prestamos]);
  }

  return (
    <main className="min-h-screen bg-slate-100 p-8">
      <h1 className="text-3xl font-bold">Préstamos</h1>

      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="font-bold">Crear préstamo</h2>
        <div className="mt-3 grid gap-2">
          {libros.map((libro) => (
            <button
              key={libro.id}
              onClick={() => crearPrestamo(libro.id)}
              className="rounded bg-blue-600 px-4 py-2 text-left text-white"
            >
              Pedir: {libro.titulo}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 rounded border bg-white p-4">
        <h2 className="font-bold">Mis préstamos</h2>
        <ul className="mt-3 space-y-2">
          {prestamos.map((prestamo) => (
            <li key={prestamo.id} className="rounded bg-slate-100 p-2">
              {prestamo.libros?.titulo} — {new Date(prestamo.fecha_prestamo).toLocaleString()}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

Qué demuestra:

```txt
Cada préstamo tiene user_id.
El frontend inserta user_id.
RLS comprueba que user_id = auth.uid().
El usuario solo ve sus propios préstamos.
```

---

## 10. Comandos útiles de ejecución

```bash
# Arrancar Next
npm run dev

# Instalar Supabase SDK sencillo
npm install @supabase/supabase-js

# Instalar Supabase SSR para Auth
npm install @supabase/ssr

# Instalar Zustand
npm install zustand

# Instalar iconos
npm install lucide-react

# Instalar componentes shadcn
npx shadcn@latest add button card input label

# Crear build de producción
npm run build
```

---

## 11. Errores típicos y solución

| Error | Causa | Solución |
|---|---|---|
| `useState is not allowed` | Falta `"use client"` | Pon `"use client"` arriba |
| Imagen externa no carga | Dominio no autorizado | Añade `hostname` en `next.config.mjs` |
| Supabase devuelve `Invalid API key` | `.env.local` mal | Revisa URL y key, reinicia servidor |
| `.insert()` falla por RLS | No hay política de insert | Crea política con `WITH CHECK` |
| `.select()` devuelve vacío | RLS bloquea filas | Crea política de select |
| Login funciona pero dashboard no se actualiza | Cookies nuevas no refrescadas | Usa `router.refresh()` |
| DELETE no borra nada | RLS filtra silenciosamente | Crea política de delete |

---

## 12. Orden de práctica recomendado

1. Haz `/energia`.
2. Haz `/h2`.
3. Haz `/placas`.
4. Haz `/fabrica`.
5. Crea Supabase y haz `/biblioteca`.
6. Añade `/login`, `/register`, `/dashboard`.
7. Añade `/prestamos`.
8. Explica en voz alta qué parte pertenece a cada manual.

Si puedes hacer esos ocho pasos, vas muy bien preparado para el examen.

---

## Fuentes oficiales contrastadas

- Supabase SSR para Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase JS `select`: https://supabase.com/docs/reference/javascript/select
- Supabase JS `insert`: https://supabase.com/docs/reference/javascript/insert
