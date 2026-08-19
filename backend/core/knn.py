import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

def entrenar_knn(data):
    """
    Entrena el modelo KNN básico usando todo el conjunto de datos.
    """
    X = []
    y = []

    for item in data:
        X.append(item['valores'])
        y.append(item['label'])

    # Ajustamos n_neighbors dinámicamente para que no supere el número de muestras
    n_vecinos = min(3, len(X))
    modelo = KNeighborsClassifier(n_neighbors=n_vecinos)
    modelo.fit(X, y)

    return modelo

def predecir(modelo, nuevo):
    """
    Realiza una predicción individual.
    """
    return modelo.predict([nuevo])[0]

def evaluar_modelo_knn(data, k_folds=5):
    """
    Ejecuta validación cruzada (k-fold) y calcula métricas de rendimiento.
    Retorna un diccionario estructurado para enviar por JSON al frontend.
    """
    # 1. Separar matriz de características (X) y vector objetivo (y)
    X = np.array([item['valores'] for item in data])
    y = np.array([item['label'] for item in data])
    
    # 2. Ajuste de seguridad: Asegurar que los k-folds no superen la cantidad de datos
    k_folds_reales = min(k_folds, len(X))
    if k_folds_reales < 2:
        # Si hay menos de 2 registros, no es posible hacer cross-validation
        return None 

    # Asegurar vecinos válidos (al menos 1, pero no mayor a las muestras de entrenamiento)
    n_vecinos = min(3, len(X) - 1)
    if n_vecinos < 1:
        n_vecinos = 1

    # 3. Configurar el modelo y la estrategia K-Fold
    modelo = KNeighborsClassifier(n_neighbors=n_vecinos)
    kf = KFold(n_splits=k_folds_reales, shuffle=True, random_state=42)

    # 4. Obtener las predicciones combinadas de todos los k-folds
    y_pred = cross_val_predict(modelo, X, y, cv=kf)

    # 5. Calcular las métricas
    # Usamos average='weighted' para manejar correctamente datos desbalanceados
    # (ej. si hay muchas más plantas normales que anómalas)
    exactitud = accuracy_score(y, y_pred)
    precision = precision_score(y, y_pred, average='weighted', zero_division=0)
    sensibilidad = recall_score(y, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y, y_pred, average='weighted', zero_division=0)
    
    # Generar la matriz de confusión y convertirla a lista nativa para JSON
    matriz = confusion_matrix(y, y_pred).tolist()

    # 6. Empaquetar resultados en porcentajes (0 a 100)
    return {
        "accuracy": round(exactitud * 100, 2),
        "precision": round(precision * 100, 2),
        "recall": round(sensibilidad * 100, 2),
        "f1_score": round(f1 * 100, 2),
        "matriz_confusion": matriz
    }