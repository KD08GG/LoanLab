from rest_framework import viewsets
from inventario.models import Ubicacion
from inventario.serializers import UbicacionSerializer

class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = Ubicacion.objects.all()
    serializer_class = UbicacionSerializer
