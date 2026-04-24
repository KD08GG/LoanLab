from django.db import models


# =========================================================
# 1) ENTIDADES BASE
# =========================================================

class Rol(models.Model):
    id_rol = models.AutoField(primary_key=True)  # Id_Rol (PK)
    nombre_rol = models.CharField(max_length=60)  # nombre_rol: STRING

    def __str__(self):
        return self.nombre_rol


class Usuario(models.Model):

    class EstadoUsuario(models.TextChoices):
        ACTIVO = 'activo', 'Activo'
        FUERA = 'fuera', 'Fuera'
        SUSPENDIDO = 'suspendido', 'Suspendido'
        PRESTAMO = 'prestamo', 'Préstamo extendido'

    class ProgramaUsuario(models.TextChoices):
        STEM = 'stem', 'STEM'
        SERVICIO = 'servicio', 'Servicio Social'
        HONORES = 'honores', 'Honores'

    id_usuario = models.IntegerField(primary_key=True)
    nombre_usuario = models.CharField(max_length=120)
    correo = models.EmailField(max_length=120, unique=True)
    id_rol = models.ForeignKey(Rol, on_delete=models.PROTECT, db_column="id_rol")
    password = models.CharField(max_length=255)
    inLab = models.BooleanField(default=False)

    programa = models.CharField(
        max_length=20,
        choices=ProgramaUsuario.choices,
        default=ProgramaUsuario.STEM
    )

    ultimo_acceso = models.DateTimeField(blank=True, null=True)

    estado_usuario = models.CharField(
        max_length=20,
        choices=EstadoUsuario.choices,
        default=EstadoUsuario.ACTIVO
    )

    def __str__(self):
        return f"{self.nombre_usuario} ({self.correo})"


class Categoria(models.Model):
    id_categoria = models.AutoField(primary_key=True)  # Id_Categoria (PK)
    nombre_categoria = models.CharField(max_length=80)  # Nombre_Categoria: STRING

    def __str__(self):
        return self.nombre_categoria


class Ubicacion(models.Model):
    id_ubicacion = models.AutoField(primary_key=True)  # Id_Ubicacion (PK)
    nombre_ubicacion = models.CharField(max_length=80)  # nombre_ubicacion: STRING

    def __str__(self):
        return self.nombre_ubicacion


class EstadoEquipo(models.Model):
    id_estado_equipo = models.AutoField(primary_key=True)  # Id_estado_equipo (PK)

    DISPONIBLE = "Disponible"
    OCUPADO = "Ocupado"
    MANTENIMIENTO = "Mantenimiento"
    NO_DISPOSIBLE = "No disponible"
    ESTADOS_EQUIPO = [
        (DISPONIBLE, "Disponible"),
        (OCUPADO, "Ocupado"),
        (MANTENIMIENTO, "Mantenimiento"),
        (NO_DISPOSIBLE, "No disponible"),]

    nombre_estado = models.CharField(max_length=30, choices=ESTADOS_EQUIPO)  # ENUM(...)

    def __str__(self):
        return self.nombre_estado


class Equipo(models.Model):
    id_equipo = models.AutoField(primary_key=True)  # Id_Equipo (PK)
    nombre_equipo = models.CharField(max_length=120)  # nombre_equipo: STRING
    marca = models.CharField(max_length=80)  # marca: STRING
    modelo = models.CharField(max_length=80)  # modelo: STRING
    num_serie = models.CharField(max_length=80)  # num_serie: string

    fecha_alta = models.DateField()  # fecha_alta: DATE
    fecha_baja = models.DateField(blank=True, null=True)  # fecha_baja: DATE (puede ser NULL)
    activo_equipo = models.BooleanField(default=True)  # activo_equipo: BOOLEAN

    id_categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, db_column="id_categoria")  # FK
    id_ubicacion = models.ForeignKey(Ubicacion, on_delete=models.PROTECT, db_column="id_ubicacion")  # FK
    id_estado_equipo = models.ForeignKey(EstadoEquipo, on_delete=models.PROTECT, db_column="id_estado_equipo")  # FK

    def __str__(self):
        return f"{self.nombre_equipo} - {self.num_serie}"


# =========================================================
# 2) SOLICITUD
# =========================================================
class Solicitud(models.Model):
    id_solicitud = models.AutoField(primary_key=True)

    id_usuario_solicita = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column="id_usuario_solicita"
    )

    id_equipo = models.ForeignKey(
        Equipo,
        on_delete=models.PROTECT,
        db_column="id_equipo"
    )

    fecha_solicitud = models.DateTimeField()
    grupo_solicitud = models.CharField(max_length=80)

    PENDIENTE = "Pendiente"
    APROBADA = "Aprobada"
    RECHAZADA = "Rechazada"
    CANCELADA = "Cancelada"
    ESTADOS_SOLICITUD = [
        (PENDIENTE, "Pendiente"),
        (APROBADA, "Aprobada"),
        (RECHAZADA, "Rechazada"),
        (CANCELADA, "Cancelada"),
    ]
    estado_solicitud = models.CharField(
        max_length=20,
        choices=ESTADOS_SOLICITUD
    )

    TIPO_NORMAL = "Normal"
    TIPO_EVENTO = "Evento"
    TIPO_EXTENDIDO = "Extendido"
    TIPOS_SOLICITUD = [
        (TIPO_NORMAL, "Normal"),
        (TIPO_EVENTO, "Evento"),
        (TIPO_EXTENDIDO, "Extendido"),
    ]
    tipo_solicitud = models.CharField(
        max_length=15,
        choices=TIPOS_SOLICITUD,
        default=TIPO_NORMAL
    )

    motivo = models.CharField(max_length=255, blank=True, null=True)

    fecha_inicio_prestamo = models.DateTimeField(blank=True, null=True)
    fecha_fin_prestamo = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Solicitud {self.id_solicitud} - {self.tipo_solicitud} - {self.estado_solicitud}"
# =========================================================
# 3) PRÉSTAMO
# =========================================================

class Prestamo(models.Model):
    id_prestamo = models.AutoField(primary_key=True)

    id_equipo = models.ForeignKey(
        Equipo,
        on_delete=models.PROTECT,
        db_column="id_equipo"
    )

    id_usuario = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column="id_usuario",
        related_name="prestamos"
    )

    fecha_inicio = models.DateTimeField()
    fecha_fin = models.DateTimeField(null=True, blank=True)

    ACTIVO = "activo"
    CERRADO = "cerrado"
    VENCIDO = "vencido"
    ESTADOS_PRESTAMO = [
        (ACTIVO, "activo"),
        (CERRADO, "cerrado"),
        (VENCIDO, "vencido"),
    ]
    estado_prestamo = models.CharField(
        max_length=10,
        choices=ESTADOS_PRESTAMO
    )

    id_estado_equipo = models.ForeignKey(
        EstadoEquipo,
        on_delete=models.PROTECT,
        db_column="id_estado_equipo"
    )

    id_usuario_entrega = models.ForeignKey(
        Usuario,
        on_delete=models.PROTECT,
        db_column="id_usuario_entrega",
        related_name="prestamos_entregados"
    )

    id_solicitud = models.ForeignKey(
        Solicitud,
        on_delete=models.PROTECT,
        db_column="id_solicitud"
    )

    PENDIENTE = "Pendiente"
    APROBADA = "Aprobada"
    RECHAZADA = "Rechazada"
    CANCELADA = "Cancelada"
    ESTADOS_SOLICITUD = [
        (PENDIENTE, "Pendiente"),
        (APROBADA, "Aprobada"),
        (RECHAZADA, "Rechazada"),
        (CANCELADA, "Cancelada"),
    ]
    estado_solicitud = models.CharField(
        max_length=20,
        choices=ESTADOS_SOLICITUD
    )

    def __str__(self):
        return f"Prestamo {self.id_prestamo} - {self.estado_prestamo}"


# =========================================================
# 4) MANTENIMIENTO
# =========================================================

class Mantenimiento(models.Model):
    id_mantenimiento = models.AutoField(primary_key=True)  # Id_Mantenimiento (PK)

    id_equipo = models.ForeignKey(
        Equipo,
        on_delete=models.PROTECT,
        db_column="id_equipo"
    )  # Id_Equipo (FK -> Equipo.Id_Equipo)

    fecha_inicio_mantenimiento = models.DateTimeField()  # Fecha_Inicio_Mantenimiento: DATETIME
    fecha_fin_mantenimiento = models.DateTimeField(blank=True, null=True)  # puede ser NULL si sigue activo

    ACTIVO = "Activo"
    FINALIZADO = "Finalizado"
    ESTADOS_MANTENIMIENTO = [
        (ACTIVO, "Activo"),
        (FINALIZADO, "Finalizado"),
    ]
    estado_mantenimiento = models.CharField(
        max_length=12,
        choices=ESTADOS_MANTENIMIENTO
    )  # ENUM('Activo','Finalizado')

    descripcion_problema = models.CharField(max_length=255)  # descripcion_problema: string

    def __str__(self):
        return f"Mantenimiento {self.id_mantenimiento} - {self.estado_mantenimiento}"


# =========================================================
# 5) QR_LOGIN
# =========================================================

class QRLogin(models.Model):
    qr_login = models.CharField(max_length=120)  # QR_Login STRING

    id_usuario = models.CharField(max_length=50)  # Id_Usuario STRING
    nombre = models.CharField(max_length=120)  # nombre STRING
    correo = models.CharField(max_length=120)  # correo STRING
    entrada = models.CharField(max_length=60)  # entrada STRING
    salida = models.CharField(max_length=60)  # salida STRING

    def __str__(self):
        return f"QRLogin - {self.id_usuario}"

