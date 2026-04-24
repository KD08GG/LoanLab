from rest_framework import serializers
from .models import (
    Rol, Usuario, Categoria, Ubicacion, EstadoEquipo,
    Equipo, Solicitud, Prestamo, Mantenimiento, QRLogin
)

from django.contrib.auth.hashers import make_password

class RolSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rol
        fields = "__all__"


class UsuarioSerializer(serializers.ModelSerializer):
    correo = serializers.EmailField()

    class Meta:
        model = Usuario
        fields = "__all__"
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_correo(self, value):
        value = value.strip().lower()

        qs = Usuario.objects.filter(correo__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("Ya existe un usuario con ese correo.")

        return value

    def validate_nombre_usuario(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre de usuario no puede ir vacío.")
        return value

    def validate_password(self, value):
        value = value.strip()
        if len(value) < 6:
            raise serializers.ValidationError("La contraseña debe tener al menos 6 caracteres.")
        return value

    def create(self, validated_data):
        validated_data['password'] = make_password(validated_data['password'])
        return super().create(validated_data)

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            validated_data['password'] = make_password(validated_data['password'])
        return super().update(instance, validated_data)

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = "__all__"

    def validate_nombre_categoria(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre de la categoría no puede ir vacío.")
        return value


class UbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ubicacion
        fields = "__all__"

    def validate_nombre_ubicacion(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre de la ubicación no puede ir vacío.")
        return value


class EstadoEquipoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoEquipo
        fields = "__all__"

    def validate_nombre_estado(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("El nombre del estado no puede ir vacío.")

        qs = EstadoEquipo.objects.filter(nombre_estado__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("Ya existe un estado de equipo con ese nombre.")

        return value


class EquipoSerializer(serializers.ModelSerializer):
    estado = serializers.CharField(source='id_estado_equipo.nombre_estado', read_only=True)

    class Meta:
        model = Equipo
        fields = "__all__"

    def validate_num_serie(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("El número de serie no puede ir vacío.")

        qs = Equipo.objects.filter(num_serie__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("Ya existe un equipo con ese número de serie.")

        return value

    def validate_nombre_equipo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre del equipo no puede ir vacío.")
        return value

    def validate_marca(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La marca no puede ir vacía.")
        return value

    def validate_modelo(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El modelo no puede ir vacío.")
        return value

    def validate(self, data):
        fecha_alta = data.get("fecha_alta", getattr(self.instance, "fecha_alta", None))
        fecha_baja = data.get("fecha_baja", getattr(self.instance, "fecha_baja", None))
        activo_equipo = data.get("activo_equipo", getattr(self.instance, "activo_equipo", True))
        estado_equipo = data.get("id_estado_equipo", getattr(self.instance, "id_estado_equipo", None))

        if fecha_baja and fecha_alta and fecha_baja < fecha_alta:
            raise serializers.ValidationError({
                "fecha_baja": "La fecha_baja no puede ser menor que la fecha_alta."
            })

        if activo_equipo and fecha_baja:
            raise serializers.ValidationError({
                "fecha_baja": "Un equipo activo no debe tener fecha_baja."
            })

        if not activo_equipo and not fecha_baja:
            raise serializers.ValidationError({
                "fecha_baja": "Si el equipo está inactivo, debe registrarse fecha_baja."
            })

        if not activo_equipo and estado_equipo:
            if estado_equipo.nombre_estado.strip().lower() != "no disponible":
                raise serializers.ValidationError({
                    "id_estado_equipo": "Si el equipo está inactivo, su estado debe ser 'No disponible'."
                })

        return data

class SolicitudSerializer(serializers.ModelSerializer):
    class Meta:
        model = Solicitud
        fields = "__all__"

    def validate_grupo_solicitud(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El grupo de la solicitud no puede ir vacío.")
        return value

    def validate(self, data):
        equipo = data.get("id_equipo", getattr(self.instance, "id_equipo", None))

        if equipo and not equipo.activo_equipo:
            raise serializers.ValidationError({
                "id_equipo": "No se puede crear una solicitud para un equipo inactivo."
            })

        return data


class PrestamoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prestamo
        fields = "__all__"

    def validate(self, data):
        fecha_inicio = data.get("fecha_inicio", getattr(self.instance, "fecha_inicio", None))
        fecha_fin = data.get("fecha_fin", getattr(self.instance, "fecha_fin", None))
        equipo = data.get("id_equipo", getattr(self.instance, "id_equipo", None))
        estado_prestamo = data.get("estado_prestamo", getattr(self.instance, "estado_prestamo", None))

        if fecha_inicio and fecha_fin and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                "fecha_fin": "La fecha_fin no puede ser menor que la fecha_inicio."
            })

        if equipo and estado_prestamo == Prestamo.ACTIVO:
            prestamos_activos = Prestamo.objects.filter(
                id_equipo=equipo,
                estado_prestamo=Prestamo.ACTIVO
            )

            if self.instance:
                prestamos_activos = prestamos_activos.exclude(pk=self.instance.pk)

            traslape = prestamos_activos.filter(
                fecha_inicio__lt=fecha_fin,
                fecha_fin__gt=fecha_inicio
            )

            if traslape.exists():
                raise serializers.ValidationError({
                    "id_equipo": "Ya existe un préstamo activo de ese equipo en ese rango de tiempo."
                })

        return data


class MantenimientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mantenimiento
        fields = "__all__"

    def validate_descripcion_problema(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("La descripción del problema no puede ir vacía.")
        return value

    def validate(self, data):
        fecha_inicio = data.get(
            "fecha_inicio_mantenimiento",
            getattr(self.instance, "fecha_inicio_mantenimiento", None)
        )
        fecha_fin = data.get(
            "fecha_fin_mantenimiento",
            getattr(self.instance, "fecha_fin_mantenimiento", None)
        )
        estado = data.get(
            "estado_mantenimiento",
            getattr(self.instance, "estado_mantenimiento", None)
        )

        if fecha_fin and fecha_inicio and fecha_fin < fecha_inicio:
            raise serializers.ValidationError({
                "fecha_fin_mantenimiento": "La fecha_fin_mantenimiento no puede ser menor que la fecha_inicio_mantenimiento."
            })

        if estado == Mantenimiento.ACTIVO and fecha_fin:
            raise serializers.ValidationError({
                "fecha_fin_mantenimiento": "Un mantenimiento activo no debería tener fecha_fin_mantenimiento."
            })

        if estado == Mantenimiento.FINALIZADO and not fecha_fin:
            raise serializers.ValidationError({
                "fecha_fin_mantenimiento": "Un mantenimiento finalizado debe tener fecha_fin_mantenimiento."
            })

        return data


class QRLoginSerializer(serializers.ModelSerializer):
    correo = serializers.EmailField()

    class Meta:
        model = QRLogin
        fields = "__all__"

    def validate_qr_login(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El valor de qr_login no puede ir vacío.")
        return value

    def validate_nombre(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El nombre no puede ir vacío.")
        return value

    def validate_id_usuario(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("El id_usuario no puede ir vacío.")
        return value