from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Avg
import numpy as np
from sklearn.neighbors import LocalOutlierFactor

# Librerías científicas añadidas para el análisis estadístico real
import pandas as pd
import statsmodels.api as sm
from statsmodels.formula.api import ols
from statsmodels.stats.multicomp import pairwise_tukeyhsd
import itertools

from .models import *
from .serializers import *
# SE MODIFICÓ LA IMPORTACIÓN AQUÍ PARA INCLUIR evaluar_modelo_knn
from .knn import entrenar_knn, predecir, evaluar_modelo_knn

class CultivoViewSet(viewsets.ModelViewSet):
    queryset = Cultivo.objects.all()
    serializer_class = CultivoSerializer
    permission_classes = [IsAuthenticated]

class UnidadCultivoViewSet(viewsets.ModelViewSet):
    queryset = UnidadCultivo.objects.all()
    serializer_class = UnidadCultivoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        cultivo_id = self.request.query_params.get('cultivo')
        if cultivo_id:
            queryset = queryset.filter(cultivo_id=cultivo_id)
        return queryset

class ExperimentoViewSet(viewsets.ModelViewSet):
    queryset = Experimento.objects.all()
    serializer_class = ExperimentoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        unidad_id = self.request.query_params.get('unidad')
        if unidad_id:
            queryset = queryset.filter(unidad_id=unidad_id)
        return queryset

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)
        
class VariableViewSet(viewsets.ModelViewSet):
    queryset = Variable.objects.all()
    serializer_class = VariableSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        experimento_id = self.request.query_params.get('experimento')
        if experimento_id:
            queryset = queryset.filter(valor__experimento_id=experimento_id).distinct()
        return queryset

class ValorViewSet(viewsets.ModelViewSet):
    queryset = Valor.objects.all()
    serializer_class = ValorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        variable_id = self.request.query_params.get('variable')
        if variable_id:
            queryset = queryset.filter(variable_id=variable_id)
        return queryset

class TratamientoViewSet(viewsets.ModelViewSet):
    queryset = Tratamiento.objects.all()
    serializer_class = TratamientoSerializer
    permission_classes = [IsAuthenticated]

# ===============================
# FUNCIONES PERSONALIZADAS
# ===============================

@api_view(['GET'])
def comparar_experimentos(request):
    cultivo_nombre = request.GET.get('cultivo')
    anios = request.GET.get('anios')
    
    if not cultivo_nombre or not anios:
        return Response({"error": "Faltan parámetros"}, status=400)
        
    anios = [int(a) for a in anios.split(',')]
    datos = []
    
    experimentos = Experimento.objects.filter(
        unidad__cultivo__nombre__iexact=cultivo_nombre,
        anio__in=anios
    )
    
    for exp in experimentos:
        variables_ids = Valor.objects.filter(experimento=exp).values_list('variable', flat=True).distinct()
        variables = Variable.objects.filter(id__in=variables_ids)
        
        for var in variables:
            valores = Valor.objects.filter(experimento=exp, variable=var)
            valores_lista = [v.valor for v in valores]
            
            if valores_lista:
                datos.append({
                    "cultivo": cultivo_nombre,
                    "anio": exp.anio,
                    "variable": var.nombre,
                    "valores": valores_lista
                })
                
    return Response(datos)

@api_view(['GET'])
def analisis_variable(request):
    cultivo = request.GET.get('cultivo')
    anio = request.GET.get('anio')
    variable_nombre = request.GET.get('variable')
    tratamientos_param = request.GET.get('tratamientos')

    if not cultivo or not anio or not variable_nombre:
        return Response({"error": "Faltan parámetros"}, status=400)
    
    experimento = Experimento.objects.filter(unidad__cultivo__nombre__iexact=cultivo, anio=anio).first()
    if not experimento:
        return Response({"error": "No existe experimento"}, status=404)
        
    variable = Variable.objects.filter(nombre__iexact=variable_nombre).first()
    if not variable:
        return Response({"error": "Variable no encontrada"}, status=404)

    valores_query = Valor.objects.filter(experimento=experimento, variable=variable)

    if tratamientos_param:
        nombres_tratamientos = [t.strip() for t in tratamientos_param.split(',')]
        valores_query = valores_query.filter(tratamiento__nombre__in=nombres_tratamientos)

    tratamientos_ids = valores_query.values_list('tratamiento', flat=True).distinct()
    tratamientos = Tratamiento.objects.filter(id__in=tratamientos_ids)

    resultados = []
    for t in tratamientos:
        promedio = valores_query.filter(tratamiento=t).aggregate(prom=Avg('valor'))['prom']
        if promedio is not None:
            resultados.append({"tratamiento": t.nombre, "promedio": round(promedio, 2)})
            
    resultados.sort(key=lambda x: x['promedio'], reverse=True)
    
    return Response({
        "mejor": resultados[0] if resultados else None,
        "medio": resultados[len(resultados)//2] if resultados else None,
        "peor": resultados[-1] if resultados else None,
        "todos": resultados
    })

@api_view(['GET'])
def comparacion_anios(request):
    cultivo = request.GET.get('cultivo')
    anios = request.GET.get('anios')
    variable_nombre = request.GET.get('variable')
    tratamientos_param = request.GET.get('tratamientos')

    if not cultivo or not anios or not variable_nombre:
        return Response({"error": "Faltan parámetros"}, status=400)

    anios = [int(a) for a in anios.split(',')]
    comparacion = []
    
    variable = Variable.objects.filter(nombre__iexact=variable_nombre).first()
    if not variable:
        return Response({"error": "Variable no encontrada"}, status=404)

    for anio in anios:
        experimento = Experimento.objects.filter(unidad__cultivo__nombre__iexact=cultivo, anio=anio).first()
        if not experimento:
            continue

        valores_query = Valor.objects.filter(experimento=experimento, variable=variable)

        if tratamientos_param:
            nombres_tratamientos = [t.strip() for t in tratamientos_param.split(',')]
            valores_query = valores_query.filter(tratamiento__nombre__in=nombres_tratamientos)

        tratamientos_ids = valores_query.values_list('tratamiento', flat=True).distinct()
        tratamientos = Tratamiento.objects.filter(id__in=tratamientos_ids)

        promedios = []
        for t in tratamientos:
            prom = valores_query.filter(tratamiento=t).aggregate(prom=Avg('valor'))['prom']
            if prom is not None:
                promedios.append(prom)

        if promedios:
            comparacion.append({
                "anio": anio,
                "mejor_promedio": round(max(promedios), 2)
            })

    return Response(comparacion)

# ===============================
# FUNCIÓN KNN MODIFICADA
# ===============================
@api_view(['GET'])
def knn_prediccion(request):
    cultivo = request.GET.get('cultivo')
    variable_nombre = request.GET.get('variable')

    if not cultivo or not variable_nombre:
        return Response({"error": "Faltan parámetros"}, status=400)

    variable = Variable.objects.filter(nombre__iexact=variable_nombre).first()
    if not variable:
        return Response({"error": "Variable no encontrada"}, status=404)

    # 1. Obtenemos todos los valores del cultivo y variable seleccionada
    valores_qs = Valor.objects.filter(
        experimento__unidad__cultivo__nombre__iexact=cultivo,
        variable=variable
    ).select_related('experimento', 'tratamiento')

    if not valores_qs.exists():
        return Response({"error": "No hay datos para este cultivo y variable"}, status=404)

    # 2. Agrupamos por combinación de Experimento y Tratamiento
    agrupado = {}
    for v in valores_qs:
        tratamiento_nombre = v.tratamiento.nombre if v.tratamiento else "Sin Tratamiento"
        clave = f"{v.experimento_id}_{tratamiento_nombre}"
        
        if clave not in agrupado:
            agrupado[clave] = []
        agrupado[clave].append(v.valor)

    dataset = []
    for clave, lista_valores in agrupado.items():
        if not lista_valores:
            continue

        promedio = sum(lista_valores) / len(lista_valores)

        # Asignación del label según el promedio
        if promedio > 15:
            label = "BUENO"
        elif promedio > 10:
            label = "MEDIO"
        else:
            label = "MALO"

        # Garantizamos que la muestra tenga exactamente 3 dimensiones para sklearn
        muestra = lista_valores[:3]
        while len(muestra) < 3:
            muestra.append(promedio)

        dataset.append({"valores": muestra, "label": label})

    # 3. Validamos que tengamos al menos 2 muestras agrupadas para entrenar
    if len(dataset) < 2:
        return Response({"error": "Datos insuficientes (se requieren al menos 2 tratamientos o experimentos con datos)"}, status=400)

    try:
        modelo = entrenar_knn(dataset)
        nuevo = dataset[0]['valores']
        resultado = predecir(modelo, nuevo)

        return Response({
            "prediccion": resultado,
            "dataset": dataset
        })
    except Exception as e:
        return Response({"error": f"Error al procesar el modelo: {str(e)}"}, status=500)

# ===============================

@api_view(['GET'])
def detectar_anomalias_existentes(request):
    cultivo_id = request.GET.get('cultivo')
    lote_id = request.GET.get('lote')
    anio = request.GET.get('anio')
    variable_id = request.GET.get('variable')

    if not all([cultivo_id, lote_id, anio, variable_id]):
        return Response({'error': 'Faltan parámetros (cultivo, lote, anio, variable)'}, status=400)

    registros = Valor.objects.filter(
        variable_id=variable_id,
        experimento__anio=anio,
        experimento__unidad_id=lote_id,
        experimento__unidad__cultivo_id=cultivo_id
    ).select_related('experimento', 'tratamiento', 'variable')

    if registros.count() < 5:
        return Response({'error': 'Se necesitan al menos 5 registros con esos parámetros para realizar el análisis estadístico.'}, status=400)

    datos_lista = []
    X = []
    
    for r in registros:
        datos_lista.append({
            'id': r.id,
            'valor': r.valor,
            'planta': r.planta,
            'repeticion': r.repeticion,
            'tratamiento': r.tratamiento.nombre if r.tratamiento else "N/A"
        })
        X.append([r.valor])

    X_np = np.array(X)
    n_neighbors = min(20, len(X_np) - 1)
    
    clf = LocalOutlierFactor(n_neighbors=n_neighbors, contamination=0.1)
    preds = clf.fit_predict(X_np)

    anomalias_count = 0
    datos_para_modelo = [] # Lista requerida para la validación cruzada

    for i in range(len(datos_lista)):
        is_anomaly = True if preds[i] == -1 else False
        datos_lista[i]['es_anomalia'] = is_anomaly
        if is_anomaly:
            anomalias_count += 1
            
        # Preparación de datos (Feature y Label) para la función de validación cruzada
        datos_para_modelo.append({
            'valores': X[i],
            'label': 'ANOMALIA' if is_anomaly else 'NORMAL'
        })

    primer_registro = registros.first()
    nombre_var = primer_registro.variable.nombre
    nombre_cultivo = primer_registro.experimento.unidad.cultivo.nombre
    nombre_lote = primer_registro.experimento.unidad.nombre

    # Dentro de tu vista en Django:
    metricas_validacion = evaluar_modelo_knn(datos_para_modelo, k_folds=5)

    # Luego agregas este diccionario a tu respuesta general
    respuesta = {
        'detalles': datos_lista,
        'total_analizado': len(datos_lista),
        'total_anomalias': anomalias_count,
        'variable': nombre_var,
        'contexto': f"{nombre_cultivo} - {nombre_lote} ({anio})",
        'metricas': metricas_validacion  # ¡Añades las métricas aquí!
    }
    return Response(respuesta)

@api_view(['POST'])
def registrar_usuario(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    rol = request.data.get('rol', 'estudiante')

    if not username or not email or not password:
        return Response({"error": "Todos los campos (usuario, email y contraseña) son obligatorios."}, status=400)

    if Usuario.objects.filter(username=username).exists():
        return Response({"error": "El nombre de usuario ya está en uso."}, status=400)

    try:
        nuevo_usuario = Usuario.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        nuevo_usuario.rol = rol
        nuevo_usuario.is_staff = True
        nuevo_usuario.save()
        return Response({"message": "¡Usuario registrado con éxito!"}, status=201)
    except Exception as e:
        return Response({"error": f"No se pudo crear el usuario: {str(e)}"}, status=500)

@api_view(['GET'])
def listar_usuarios(request):
    usuarios = Usuario.objects.all().values('id', 'username', 'email', 'rol')
    return Response(list(usuarios), status=200)

@api_view(['POST', 'GET'])
def gestionar_accesos(request):
    if request.method == 'POST':
        HistorialLogin.objects.create(usuario=request.user)
        return Response({"message": "Acceso registrado"})
    elif request.method == 'GET':
        accesos = HistorialLogin.objects.all().order_by('-fecha_ingreso')[:50]
        data = [
            {
                "id": a.id,
                "usuario": a.usuario.username,
                "rol": a.usuario.rol,
                "fecha": a.fecha_ingreso.strftime("%d/%m/%Y - %H:%M:%S") 
            } for a in accesos
        ]
        return Response(data)

@api_view(['GET'])
def datos_grafico_reporte(request):
    cultivo_id = request.GET.get('cultivo')
    lote_id = request.GET.get('lote')
    anio = request.GET.get('anio')

    if not cultivo_id:
        return Response({"error": "Falta el parámetro cultivo"}, status=400)

    filtros = {'experimento__unidad__cultivo_id': cultivo_id}
    if lote_id:
        filtros['experimento__unidad_id'] = lote_id
    if anio:
        filtros['experimento__anio'] = anio

    registros = Valor.objects.filter(**filtros).select_related('variable', 'tratamiento')

    if not registros.exists():
        return Response([])

    df = pd.DataFrame(list(registros.values(
        'variable__nombre', 'tratamiento__nombre', 'repeticion', 'valor'
    )))

    # Renombramos la columna para que statsmodels no lance errores con los espacios en blanco
    df = df.rename(columns={'tratamiento__nombre': 'tratamiento_seguro'})

    lista_final = []
    variables = df['variable__nombre'].unique()

    for var_nombre in variables:
        df_var = df[df['variable__nombre'] == var_nombre]
        
        ee_global = 0.00
        cv_global = 0.00
        reject_matrix = {}
        
        tiene_variabilidad = df_var['valor'].std() > 0 if len(df_var) > 1 else False
        num_tratamientos = len(df_var['tratamiento_seguro'].unique())

        if tiene_variabilidad and num_tratamientos >= 2:
            try:
                modelo = ols('valor ~ C(tratamiento_seguro)', data=df_var).fit()
                anova_table = sm.stats.anova_lm(modelo, typ=2)
                cme = anova_table['mean_sq']['Residual']
                media_general = df_var['valor'].mean()
                
                if media_general > 0:
                    cv_global = (np.sqrt(cme) / media_general) * 100
                
                n_reps = df_var.groupby('tratamiento_seguro').size().mean()
                if n_reps > 0:
                    ee_global = np.sqrt(cme / n_reps)
                
                res_tukey = pairwise_tukeyhsd(endog=df_var['valor'], groups=df_var['tratamiento_seguro'], alpha=0.05)
                
                for name1 in res_tukey.groups_unique:
                    reject_matrix[name1] = {}
                pairs = list(itertools.combinations(res_tukey.groups_unique, 2))
                for pair, rej in zip(pairs, res_tukey.reject):
                    reject_matrix[pair[0]][pair[1]] = rej
                    reject_matrix[pair[1]][pair[0]] = rej
            except Exception:
                pass

        datos_tratamientos = []
        tratamientos_unicos = df_var['tratamiento_seguro'].unique()
        
        for trat_nombre in tratamientos_unicos:
            df_trat = df_var[df_var['tratamiento_seguro'] == trat_nombre].sort_values(by='repeticion')
            repeticiones_lista = df_trat['valor'].tolist()
            prom = df_trat['valor'].mean()
            
            datos_tratamientos.append({
                "tratamiento": trat_nombre,
                "repeticiones": repeticiones_lista,
                "promedio": round(prom, 2) if not np.isnan(prom) else 0.00,
                "rango": "",
                "ee": round(ee_global, 2) if not np.isnan(ee_global) else 0.00,
                "cv": round(cv_global, 2) if not np.isnan(cv_global) else 0.00
            })
        
        datos_tratamientos.sort(key=lambda x: x['promedio'], reverse=True)
        ordered_names = [t['tratamiento'] for t in datos_tratamientos]
        n = len(ordered_names)
        
        groups = []
        for i in range(n):
            for j in range(i, n):
                all_non_sig = True
                for k1 in range(i, j + 1):
                    for k2 in range(k1 + 1, j + 1):
                        name1 = ordered_names[k1]
                        name2 = ordered_names[k2]
                        if name1 != name2 and reject_matrix.get(name1, {}).get(name2, False):
                            all_non_sig = False
                            break
                    if not all_non_sig:
                        break
                if all_non_sig:
                    groups.append(set(ordered_names[i:j+1]))
                    
        maximal_groups = []
        for g in groups:
            if not any(g < other for other in groups):
                if g not in maximal_groups:
                    maximal_groups.append(g)
        
        def min_index(g):
            return min(ordered_names.index(x) for x in g)
        maximal_groups.sort(key=min_index)
        
        alphabet = 'abcdefghijklmnopqrstuvwxyz'
        letras_dict = {name: "" for name in ordered_names}
        for idx, g in enumerate(maximal_groups):
            letter = alphabet[idx % len(alphabet)]
            for name in g:
                letras_dict[name] += " " + letter if letras_dict[name] else letter
        
        for t in datos_tratamientos:
            t['rango'] = letras_dict.get(t['tratamiento'], 'a')
            
        lista_final.append({
            "variable": var_nombre,
            "datos": datos_tratamientos
        })

    return Response(lista_final)

# Agrega esta nueva función en tu views.py
@api_view(['DELETE'])
def eliminar_usuario(request, pk):
    try:
        # Busca el usuario usando la Primary Key (pk) que llega en la URL
        usuario = Usuario.objects.get(pk=pk)
        usuario.delete()
        return Response({"message": "Usuario eliminado correctamente"}, status=200)
    except Usuario.DoesNotExist:
        return Response({"error": "Usuario no encontrado"}, status=404)