from django.contrib import admin
from django.urls import path, include 
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Vista para comprobar el estado de la API en la raíz del servidor
def inicio_api(request):
    return JsonResponse({
        "estado": "Servidor en línea",
        "proyecto": "AGRO-UTC API"
    })

urlpatterns = [
    # 1. Ruta raíz: responde a la dirección principal (https://agro-utc.onrender.com/)
    path('', inicio_api, name='inicio_api'),

    # 2. Panel de Administración de Django
    path('admin/', admin.site.urls),
    
    # 3. Rutas de autenticación mediante Tokens JWT
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # 4. Rutas de la aplicación 'core'
    # Si en core/urls.py NO usas el prefijo 'api/', usa: path('api/', include('core.urls'))
    # Si en core/urls.py SÍ usas el prefijo 'api/', usa: path('', include('core.urls'))
    path('api/', include('core.urls')), 
]