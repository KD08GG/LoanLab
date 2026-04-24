from rest_framework.viewsets import ModelViewSet
from inventario.models import Equipo
from inventario.serializers import EquipoSerializer
from inventario.sse import send_sse_event


class EquipoViewSet(ModelViewSet):
    queryset = Equipo.objects.all()
    serializer_class = EquipoSerializer

    def perform_create(self, serializer):
        equipo = serializer.save()
        send_sse_event('equipos', f"equipo_creado:{equipo.pk}")

    def perform_update(self, serializer):
        equipo = serializer.save()
        send_sse_event('equipos', f"equipo_actualizado:{equipo.pk}")

    def perform_destroy(self, instance):
        equipo_id = instance.pk
        instance.delete()
        send_sse_event('equipos', f"equipo_eliminado:{equipo_id}")