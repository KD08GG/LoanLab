import os
import pandas as pd
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.db import transaction

from inventario.models import Usuario, Rol


class Command(BaseCommand):
    help = 'Importa usuarios desde Excel con verificación previa y sincronización opcional con DB'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Continúa con la importación aunque existan diferencias entre Excel y DB'
        )
        parser.add_argument(
            '--sync-excel',
            action='store_true',
            help='Actualiza el Excel con los datos actuales de la DB'
        )

    def normalizar_bool(self, valor):
        return str(valor).strip().lower() in ['true', 'verdadero', '1', 'si', 'sí']

    def normalizar_texto(self, valor):
        if pd.isna(valor):
            return ''
        return str(valor).strip()

    def normalizar_correo(self, valor):
        return self.normalizar_texto(valor).lower()

    def obtener_ultimo_acceso_excel(self, valor):
        if pd.isna(valor):
            return None

        dt = parse_datetime(str(valor))
        if dt and timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt

    def handle(self, *args, **options):
        file_path = os.path.join(settings.BASE_DIR, 'data', 'usuarios.xlsx')

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f'No se encontró el archivo: {file_path}'))
            return

        df = pd.read_excel(file_path)
        df.columns = df.columns.str.strip()

        columnas_requeridas = [
            'nombre_usuario',
            'id_usuario',
            'correo',
            'id_rol',
            'password',
            'inLab',
            'programa',
            'estado_usuario',
            'ultimo_acceso'
        ]

        for col in columnas_requeridas:
            if col not in df.columns:
                self.stdout.write(self.style.ERROR(f'Falta la columna obligatoria: {col}'))
                return

        # =========================
        # FASE 1: CARGA DE DATOS EXCEL
        # =========================
        excel_users = {}
        errores_excel = []

        for index, row in df.iterrows():
            try:
                correo = self.normalizar_correo(row['correo'])
                if not correo:
                    raise ValueError('correo vacío')

                id_usuario = row['id_usuario']
                if pd.isna(id_usuario):
                    raise ValueError('id_usuario vacío')

                id_rol = row['id_rol']
                if pd.isna(id_rol):
                    raise ValueError('id_rol vacío')

                nombre_usuario = self.normalizar_texto(row['nombre_usuario'])
                if not nombre_usuario:
                    raise ValueError('nombre_usuario vacío')

                excel_users[correo] = {
                    'id_usuario': int(id_usuario),
                    'nombre_usuario': nombre_usuario,
                    'id_rol': int(id_rol),
                    'programa': self.normalizar_texto(row['programa']).lower(),
                    'estado_usuario': self.normalizar_texto(row['estado_usuario']).lower(),
                    'inLab': self.normalizar_bool(row['inLab']),
                }

            except Exception as e:
                errores_excel.append(f'Fila {index + 2}: {e}')

        if errores_excel:
            self.stdout.write(self.style.ERROR('\nSe encontraron errores al leer el Excel:'))
            for err in errores_excel:
                self.stdout.write(self.style.ERROR(f'- {err}'))
            return

        # =========================
        # FASE 2: CARGA DE DATOS DB
        # =========================
        db_users = {}
        for user in Usuario.objects.select_related('id_rol').all():
            db_users[user.correo.lower()] = {
                'id_usuario': user.id_usuario,
                'nombre_usuario': (user.nombre_usuario or '').strip(),
                'id_rol': user.id_rol.id_rol,
                'programa': (user.programa or '').strip().lower(),
                'estado_usuario': (user.estado_usuario or '').strip().lower(),
                'inLab': bool(user.inLab),
            }

        # =========================
        # FASE 3: COMPARACIÓN
        # =========================
        solo_excel = []
        solo_db = []
        diferencias = []

        for correo, excel_data in excel_users.items():
            if correo not in db_users:
                solo_excel.append((correo, excel_data))
            else:
                db_data = db_users[correo]
                diffs = {}

                for campo in excel_data:
                    if excel_data[campo] != db_data[campo]:
                        diffs[campo] = (excel_data[campo], db_data[campo])

                if diffs:
                    diferencias.append((correo, diffs))

        for correo, db_data in db_users.items():
            if correo not in excel_users:
                solo_db.append((correo, db_data))

        # =========================
        # FASE 4: REPORTE
        # =========================
        self.stdout.write('\n==============================')
        self.stdout.write('RESUMEN')
        self.stdout.write('==============================')
        self.stdout.write(f'Solo en Excel : {len(solo_excel)}')
        self.stdout.write(f'Solo en DB    : {len(solo_db)}')
        self.stdout.write(f'Diferencias   : {len(diferencias)}')

        if solo_excel:
            self.stdout.write('\n[SOLO EN EXCEL]')
            for correo, data in solo_excel:
                self.stdout.write(f"- {data['id_usuario']} | {data['nombre_usuario']} | {correo}")

        if solo_db:
            self.stdout.write('\n[SOLO EN DB]')
            for correo, data in solo_db:
                self.stdout.write(f"- {data['id_usuario']} | {data['nombre_usuario']} | {correo}")

        if diferencias:
            self.stdout.write('\n[CON DIFERENCIAS]')
            for correo, diffs in diferencias:
                self.stdout.write(f'\nUsuario: {correo}')
                for campo, valores in diffs.items():
                    self.stdout.write(f'  {campo}: Excel={valores[0]} | DB={valores[1]}')

        # =========================
        # FASE 5: SINCRONIZAR EXCEL DESDE DB
        # =========================
        if options['sync_excel']:
            self.stdout.write(self.style.WARNING('\nSincronizando Excel con los datos actuales de la DB...'))

            # Actualizar filas existentes
            for index, row in df.iterrows():
                correo = self.normalizar_correo(row['correo'])
                if correo in db_users:
                    db_data = db_users[correo]
                    df.at[index, 'id_usuario'] = db_data['id_usuario']
                    df.at[index, 'nombre_usuario'] = db_data['nombre_usuario']
                    df.at[index, 'id_rol'] = db_data['id_rol']
                    df.at[index, 'programa'] = db_data['programa']
                    df.at[index, 'estado_usuario'] = db_data['estado_usuario']
                    df.at[index, 'inLab'] = db_data['inLab']

                    usuario_db = Usuario.objects.get(correo=correo)
                    df.at[index, 'ultimo_acceso'] = (
                        usuario_db.ultimo_acceso.strftime('%Y-%m-%d %H:%M:%S')
                        if usuario_db.ultimo_acceso else ''
                    )

            # Agregar usuarios que existen solo en DB
            for correo, data in solo_db:
                usuario_db = Usuario.objects.get(correo=correo)

                nueva_fila = {
                    'nombre_usuario': data['nombre_usuario'],
                    'id_usuario': data['id_usuario'],
                    'correo': correo,
                    'id_rol': data['id_rol'],
                    'password': '',
                    'inLab': data['inLab'],
                    'programa': data['programa'],
                    'estado_usuario': data['estado_usuario'],
                    'ultimo_acceso': usuario_db.ultimo_acceso.strftime('%Y-%m-%d %H:%M:%S')
                    if usuario_db.ultimo_acceso else ''
                }

                df = pd.concat([df, pd.DataFrame([nueva_fila])], ignore_index=True)

            df.to_excel(file_path, index=False)
            self.stdout.write(self.style.SUCCESS('Excel actualizado correctamente con los datos de la DB.'))
            return

        # =========================
        # FASE 6: BLOQUEO SI HAY DIFERENCIAS
        # =========================
        if (solo_excel or solo_db or diferencias) and not options['force']:
            self.stdout.write(
                self.style.WARNING('\n⚠️ Se detectaron inconsistencias. No se realizó la importación.')
            )
            self.stdout.write('Usa --force para continuar o --sync-excel para actualizar el Excel.')
            return

        if solo_excel or solo_db or diferencias:
            self.stdout.write(
                self.style.WARNING('\n⚠️ Hay inconsistencias, pero se continuará porque usaste --force.\n')
            )
        else:
            self.stdout.write(
                self.style.SUCCESS('\n✅ Todo coincide. Procediendo con la importación...\n')
            )

        # =========================
        # FASE 7: IMPORTACIÓN
        # =========================
        for index, row in df.iterrows():
            try:
                with transaction.atomic():
                    id_usuario = row['id_usuario']
                    if pd.isna(id_usuario):
                        raise ValueError('id_usuario está vacío')
                    id_usuario = int(id_usuario)

                    id_rol = row['id_rol']
                    if pd.isna(id_rol):
                        raise ValueError('id_rol está vacío')
                    rol = Rol.objects.get(id_rol=int(id_rol))

                    correo = self.normalizar_correo(row['correo'])
                    if not correo:
                        raise ValueError('correo está vacío')

                    nombre_usuario = self.normalizar_texto(row['nombre_usuario'])
                    if not nombre_usuario:
                        raise ValueError('nombre_usuario está vacío')

                    password_valor = self.normalizar_texto(row['password'])
                    programa = self.normalizar_texto(row['programa']).lower()
                    estado_usuario = self.normalizar_texto(row['estado_usuario']).lower()
                    in_lab_bool = self.normalizar_bool(row['inLab'])
                    ultimo_acceso = self.obtener_ultimo_acceso_excel(row['ultimo_acceso'])

                    if (
                        password_valor.startswith('pbkdf2_')
                        or password_valor.startswith('argon2$')
                        or password_valor.startswith('bcrypt$')
                    ):
                        password_final = password_valor
                    else:
                        password_final = make_password(password_valor)

                    usuarios_mismo_correo = Usuario.objects.filter(correo=correo)

                    if usuarios_mismo_correo.count() > 1:
                        raise ValueError(
                            f'Ya existen múltiples usuarios con el correo {correo}. Limpia duplicados primero.'
                        )

                    conflicto_id = Usuario.objects.filter(id_usuario=id_usuario).exclude(correo=correo).first()
                    if conflicto_id:
                        raise ValueError(
                            f'El id_usuario {id_usuario} ya pertenece a otro usuario ({conflicto_id.nombre_usuario})'
                        )

                    usuario_existente = usuarios_mismo_correo.first()

                    if usuario_existente:
                        Usuario.objects.filter(correo=correo).update(
                            id_usuario=id_usuario,
                            nombre_usuario=nombre_usuario,
                            id_rol=rol,
                            password=password_final,
                            inLab=in_lab_bool,
                            programa=programa,
                            estado_usuario=estado_usuario,
                            ultimo_acceso=ultimo_acceso
                        )

                        self.stdout.write(
                            self.style.WARNING(
                                f'Usuario actualizado: {id_usuario} - {nombre_usuario}'
                            )
                        )
                    else:
                        Usuario.objects.create(
                            id_usuario=id_usuario,
                            nombre_usuario=nombre_usuario,
                            correo=correo,
                            id_rol=rol,
                            password=password_final,
                            inLab=in_lab_bool,
                            programa=programa,
                            estado_usuario=estado_usuario,
                            ultimo_acceso=ultimo_acceso
                        )

                        self.stdout.write(
                            self.style.SUCCESS(
                                f'Usuario creado: {id_usuario} - {nombre_usuario}'
                            )
                        )

            except Rol.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Error en fila {index + 2}: el rol {row["id_rol"]} no existe')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error en fila {index + 2}: {e}')
                )