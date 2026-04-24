from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from inventario.models import Solicitud, Prestamo, EstadoEquipo, Usuario
from inventario.serializers import SolicitudSerializer
from inventario.sse import send_sse_event


class SolicitudViewSet(ModelViewSet):
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer

    def perform_create(self, serializer):
        solicitud = serializer.save()
        send_sse_event('solicitudes', f"solicitud_creada:{solicitud.pk}")

    def perform_update(self, serializer):
        solicitud = serializer.save()
        send_sse_event('solicitudes', f"solicitud_actualizada:{solicitud.pk}")

    def perform_destroy(self, instance):
        solicitud_id = instance.pk
        instance.delete()
        send_sse_event('solicitudes', f"solicitud_eliminada:{solicitud_id}")

    @action(detail=True, methods=['post'], url_path='aprobar')
    def aprobar(self, request, pk=None):
        solicitud = self.get_object()

        if solicitud.estado_solicitud in [Solicitud.RECHAZADA, Solicitud.CANCELADA]:
            return Response(
                {'error': 'No se puede aprobar una solicitud rechazada o cancelada'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if Prestamo.objects.filter(id_solicitud=solicitud).exists():
            return Response(
                {'error': 'Ya existe un préstamo asociado a esta solicitud'},
                status=status.HTTP_400_BAD_REQUEST
            )

        id_usuario_entrega = request.data.get('id_usuario_entrega')
        if not id_usuario_entrega:
            return Response(
                {'error': 'id_usuario_entrega es obligatorio'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            usuario_entrega = Usuario.objects.get(id_usuario=id_usuario_entrega)
        except Usuario.DoesNotExist:
            return Response(
                {'error': 'Usuario que entrega no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            estado_ocupado = EstadoEquipo.objects.get(
                nombre_estado=EstadoEquipo.OCUPADO
            )
        except EstadoEquipo.DoesNotExist:
            return Response(
                {'error': 'No existe el estado de equipo "Ocupado"'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            if solicitud.estado_solicitud != Solicitud.APROBADA:
                solicitud.estado_solicitud = Solicitud.APROBADA
                solicitud.save()

            equipo = solicitud.id_equipo
            equipo.id_estado_equipo = estado_ocupado
            equipo.save()

            prestamo = Prestamo.objects.create(
                id_equipo=solicitud.id_equipo,
                id_usuario=solicitud.id_usuario_solicita,
                fecha_inicio=timezone.now(),
                fecha_fin=None,
                estado_prestamo=Prestamo.ACTIVO,
                id_estado_equipo=estado_ocupado,
                id_usuario_entrega=usuario_entrega,
                id_solicitud=solicitud,
                estado_solicitud=solicitud.estado_solicitud
            )

        send_sse_event('solicitudes', f"solicitud_actualizada:{solicitud.pk}")
        send_sse_event('equipos', f"equipo_actualizado:{equipo.pk}")
        send_sse_event('prestamos', f"prestamo_creado:{prestamo.pk}")

        return Response(
            {
                'mensaje': 'Solicitud aprobada y préstamo creado correctamente',
                'id_solicitud': solicitud.id_solicitud,
                'id_prestamo': prestamo.id_prestamo,
                'estado_solicitud': solicitud.estado_solicitud,
                'estado_prestamo': prestamo.estado_prestamo,
                'id_equipo': equipo.id_equipo,
                'estado_equipo': estado_ocupado.nombre_estado,
                'fecha_inicio': prestamo.fecha_inicio,
                'fecha_fin': prestamo.fecha_fin
            },
            status=status.HTTP_200_OK
        )
