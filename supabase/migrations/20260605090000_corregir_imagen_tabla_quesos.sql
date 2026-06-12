update public.productos
set imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/tablas-quesos.jpg'
where nombre = 'Tabla de quesos'
  and imagen_url = 'http://localhost:54321/storage/v1/object/public/productos/tabla-quesos.jpg';
