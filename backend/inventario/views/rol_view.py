from rest_framework.viewsets import ModelViewSet
from inventario.models import Rol
from inventario.serializers import RolSerializer

class RolViewSet(ModelViewSet):
    queryset = Rol.objects.all()
    serializer_class = RolSerializer