-- V12__nino_plan_precio_descuento.sql
ALTER TABLE nino_plan ADD COLUMN precio_acordado DECIMAL(12, 2);
ALTER TABLE nino_plan ADD COLUMN porcentaje_descuento DECIMAL(5, 2) DEFAULT 0;
