import os
import pandas as pd
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_date, parse_datetime

from inventario.models import Equipo, Categoria, EstadoEquipo, Ubicacion


class Command(BaseCommand):
    help = 'Importa equipos desde Excel'

    def handle(self, *args, **kwargs):
        file_path = os.path.join(settings.BASE_DIR, 'data', 'equipos_importar.xlsx')

        # Verificar que exista el archivo
        if not os.path.exists(file_path):
            self.stdout.write(
                self.style.ERROR(f'No se encontró el archivo: {file_path}')
            )
            return

        # Leer Excel
        df = pd.read_excel(file_path)

        # Limpiar nombres de columnas
        df.columns = df.columns.str.strip()

        for index, row in df.iterrows():
            try:
                # Campos básicos
                nombre_equipo = str(row['nombre_equipo']).strip()
                marca = str(row['marca']).strip()
                modelo = str(row['modelo']).strip()
                num_serie = str(row['num_serie']).strip()

                # Validaciones básicas
                if not nombre_equipo:
                    raise ValueError("nombre_equipo vacío")

                if not marca:
                    raise ValueError("marca vacía")

                if not modelo:
                    raise ValueError("modelo vacío")

                if not num_serie:
                    raise ValueError("num_serie vacío")

                # Validar IDs
                if pd.isna(row['id_categoria']):
                    raise ValueError("id_categoria vacío")

                if pd.isna(row['id_estado_equipo']):
                    raise ValueError("id_estado_equipo vacío")

                if pd.isna(row['id_ubicacion']):
                    raise ValueError("id_ubicacion vacío")

                # Relaciones FK
                categoria = Categoria.objects.get(
                    id_categoria=int(row['id_categoria'])
                )

                estado_equipo = EstadoEquipo.objects.get(
                    id_estado_equipo=int(row['id_estado_equipo'])
                )

                ubicacion = Ubicacion.objects.get(
                    id_ubicacion=int(row['id_ubicacion'])
                )

                # Fecha alta
                fecha_alta = None
                if pd.notna(row['fecha_alta']):
                    valor_fecha = str(row['fecha_alta']).strip()
                    fecha_alta = parse_date(valor_fecha)

                    if fecha_alta is None:
                        dt = parse_datetime(valor_fecha)
                        if dt:
                            fecha_alta = dt.date()

                # Fecha baja
                fecha_baja = None
                if 'fecha_baja' in df.columns and pd.notna(row['fecha_baja']):
                    valor_fecha = str(row['fecha_baja']).strip()
                    fecha_baja = parse_date(valor_fecha)

                    if fecha_baja is None:
                        dt = parse_datetime(valor_fecha)
                        if dt:
                            fecha_baja = dt.date()

                # Boolean activo
                activo_val = str(row['activo_equipo']).strip().lower()
                activo_bool = activo_val in ['true', 'verdadero', '1', 'si', 'sí']

                # Crear o actualizar
                equipo, created = Equipo.objects.update_or_create(
                    num_serie=num_serie,
                    defaults={
                        'nombre_equipo': nombre_equipo,
                        'marca': marca,
                        'modelo': modelo,
                        'fecha_alta': fecha_alta,
                        'fecha_baja': fecha_baja,
                        'activo_equipo': activo_bool,
                        'id_categoria': categoria,
                        'id_estado_equipo': estado_equipo,
                        'id_ubicacion': ubicacion
                    }
                )

                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✔ Equipo creado: {equipo.id_equipo} - {equipo.nombre_equipo}'
                        )
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f'⚠ Equipo actualizado: {equipo.id_equipo} - {equipo.nombre_equipo}'
                        )
                    )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error en fila {index + 2}: {e}')
                )