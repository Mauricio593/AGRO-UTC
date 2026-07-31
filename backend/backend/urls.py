from django.contrib import admin
from django.urls import path, include 
from django.http import JsonResponse
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
def inicio_api(request):
    return JsonResponse({
        "estado": "Servidor en línea",
        "proyecto": "AGRO-UTC API"
    })
urlpatterns = [
    path('admin/', admin.site.urls),
    
    # --- RUTAS DE LOGIN (JWT) ---
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # --- RUTAS DE TU APLICACIÓN ---
    # Esto le dice a Django: "Todo lo demás, búscalo en el archivo urls.py de la app 'core'"
    path('', include('core.urls')), 
]