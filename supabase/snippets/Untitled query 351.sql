CREATE TABLE productos3 (
  id          serial PRIMARY KEY,
  nombre      text NOT NULL,
  stock       int NOT NULL DEFAULT 0,
  actualizado timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movimientos_stock3 (
  id          serial PRIMARY KEY,
  producto_id int REFERENCES productos(id),
  cambio      int NOT NULL,        -- positivo = entrada, negativo = salida
  motivo      text,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION actualizar_stock_productos()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE productos
  SET
    stock       = stock + NEW.cambio,
    actualizado = now()
  WHERE id = NEW.producto_id;
   RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_actualizar_movimientos_stock
  AFTER INSERT
  ON movimientos_stock3
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_stock_productos();

  -- Probar:
INSERT INTO productos (nombre, stock) VALUES ('Cerveza', 100);
INSERT INTO movimientos_stock (producto_id, cambio, motivo) VALUES (1, -5, 'venta');
SELECT stock FROM productos WHERE id = 1;  -- 95