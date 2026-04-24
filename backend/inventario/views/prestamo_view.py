from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from inventario.models import Prestamo, EstadoEquipo, Usuario
from inventario.serializers import PrestamoSerializer
from inventario.sse import send_sse_event


class PrestamoViewSet(ModelViewSet):
    queryset = Prestamo.objects.all()
    serializer_class = PrestamoSerializer

    @action(detail=True, methods=['post'], url_path='devolver')
    def devolver(self, request, pk=None):
        prestamo = self.get_object()

        if prestamo.estado_prestamo != Prestamo.ACTIVO:
            return Response(
                {'error': 'Solo se pueden devolver préstamos activos'},
                status=status.HTTP_400_BAD_REQUEST
            )

        id_usuario_entrega = request.data.get('id_usuario_entrega')

        try:
            estado_disponible = EstadoEquipo.objects.get(
                nombre_estado=EstadoEquipo.DISPONIBLE
            )
        except EstadoEquipo.DoesNotExist:
            return Response(
                {'error': 'No existe el estado de equipo "Disponible"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            prestamo.estado_prestamo = Prestamo.CERRADO
            prestamo.id_estado_equipo = estado_disponible
            prestamo.fecha_fin = timezone.now()

            if id_usuario_entrega:
                try:
                    usuario_entrega = Usuario.objects.get(id_usuario=id_usuario_entrega)
                    prestamo.id_usuario_entrega = usuario_entrega
                except Usuario.DoesNotExist:
                    return Response(
                        {'error': 'Usuario que entrega no encontrado'},
                        status=status.HTTP_404_NOT_FOUND
                    )

            prestamo.save()

            equipo = prestamo.id_equipo
            equipo.id_estado_equipo = estado_disponible
            equipo.save()

            usuario = prestamo.id_usuario
            usuario.estado_usuario = Usuario.EstadoUsuario.ACTIVO
            usuario.save()

        send_sse_event('prestamos', f"prestamo_devuelto:{prestamo.pk}")
        send_sse_event('equipos', f"equipo_actualizado:{equipo.pk}")
        send_sse_event('usuarios', f"usuario_actualizado:{usuario.pk}")

        return Response(
            {
                'mensaje': 'Préstamo devuelto correctamente',
                'id_prestamo': prestamo.id_prestamo,
                'estado_prestamo': prestamo.estado_prestamo,
                'id_equipo': equipo.id_equipo,
                'estado_equipo': estado_disponible.nombre_estado,
                'fecha_inicio': prestamo.fecha_inicio,
                'fecha_fin': prestamo.fecha_fin,
                'id_usuario': usuario.id_usuario
            },
            status=status.HTTP_200_OK
        )
