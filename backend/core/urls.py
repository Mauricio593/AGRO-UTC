from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CultivoViewSet, 
    UnidadCultivoViewSet, 
    ExperimentoViewSet, 
    VariableViewSet,
    ValorViewSet, 
    TratamientoViewSet,
    analisis_variable,
    comparacion_anios,
    knn_prediccion,
    detectar_anomalias_existentes,
    registrar_usuario,
    eliminar_usuario,
    listar_usuarios,
    # 📊 AGREGAMOS LAS NUEVAS FUNCIONES DE REPORTES Y ACCESOS AQUÍ:
    gestionar_accesos,
    datos_grafico_reporte
)

# Creamos el enrutador para las APIs automáticas
router = DefaultRouter()
router.register(r'cultivos', CultivoViewSet)
router.register(r'unidades', UnidadCultivoViewSet)
router.register(r'experimentos', ExperimentoViewSet)
router.register(r'variables', VariableViewSet)
router.register(r'valores', ValorViewSet) 
router.register(r'tratamientos', TratamientoViewSet)

urlpatterns = [
    # Incluimos todas las rutas automáticas del router bajo el prefijo 'api/'
    path('api/', include(router.urls)),
    
    # RUTAS PERSONALIZADAS
    path('api/analisis/', analisis_variable),
    path('api/comparar/', comparacion_anios),
    path('api/knn/', knn_prediccion),
    
    # NUEVA RUTA PARA DETECCIÓN DE ANOMALÍAS:
    path('api/knn-anomalias-existentes/', detectar_anomalias_existentes),
    
    # 👥 NUEVAS RUTAS PARA REGISTRO Y SEGURIDAD DE USUARIOS:
    path('api/registro/', registrar_usuario),
    path('api/usuarios/', listar_usuarios),
    path('api/usuarios/<int:pk>/', eliminar_usuario),

    # 📊 NUEVAS RUTAS PARA EL MÓDULO DE REPORTES Y ACCESOS:
    path('api/accesos/', gestionar_accesos),
    path('api/reporte-grafico/', datos_grafico_reporte),
]