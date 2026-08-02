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
    # Incluimos todas las rutas automáticas del router SIN el prefijo 'api/'
    path('', include(router.urls)),
    
    # RUTAS PERSONALIZADAS SIN EL PREFIJO 'api/'
    path('analisis/', analisis_variable),
    path('comparar/', comparacion_anios),
    path('knn/', knn_prediccion),
    
    # NUEVA RUTA PARA DETECCIÓN DE ANOMALÍAS:
    path('knn-anomalias-existentes/', detectar_anomalias_existentes),
    
    # 👥 NUEVAS RUTAS PARA REGISTRO Y SEGURIDAD DE USUARIOS:
    path('registro/', registrar_usuario),
    path('usuarios/', listar_usuarios),
    path('usuarios/<int:pk>/', eliminar_usuario),

    # 📊 NUEVAS RUTAS PARA EL MÓDULO DE REPORTES Y ACCESOS:
    path('accesos/', gestionar_accesos),
    path('reporte-grafico/', datos_grafico_reporte),
]