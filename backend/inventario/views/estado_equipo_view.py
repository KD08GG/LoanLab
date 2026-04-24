from rest_framework import viewsets
from inventario.models import EstadoEquipo
from inventario.serializers import EstadoEquipoSerializer

class EstadoEquipoViewSet(viewsets.ModelViewSet):
    queryset = EstadoEquipo.objects.all()
    serializer_class = EstadoEquipoSerializer
