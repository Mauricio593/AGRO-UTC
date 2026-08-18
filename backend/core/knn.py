import numpy as np
from sklearn.neighbors import KNeighborsClassifier, LocalOutlierFactor
from sklearn.ensemble import IsolationForest
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import warnings

# Suprimir warnings visuales de scikit-learn
warnings.filterwarnings('ignore')

def entrenar_knn(data):
    """
    Entrena el modelo KNN básico usando todo el conjunto de datos.
    """
    X = []
    y = []

    for item in data:
        X.append(item['valores'])
        y.append(item['label'])

    n_vecinos = min(3, len(X))
    modelo = KNeighborsClassifier(n_neighbors=n_vecinos)
    modelo.fit(X, y)

    return modelo

def predecir(modelo, nuevo):
    """
    Realiza una predicción individual.
    """
    return modelo.predict([nuevo])[0]

def calcular_metricas(y_true, y_pred):
    """
    Calcula el diccionario de métricas estandarizado para cualquier algoritmo.
    """
    return {
        'accuracy': round(accuracy_score(y_true, y_pred) * 100, 2),
        'precision': round(precision_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'recall': round(recall_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'f1_score': round(f1_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'matriz_confusion': confusion_matrix(y_true, y_pred).tolist()
    }

def evaluar_modelo_knn(data, k_folds=5):
    """
    Ejecuta y compara KNN, Isolation Forest y Local Outlier Factor (LOF).
    Retorna las métricas comparativas para el frontend.
    """
    # 1. Separar matriz de características (X) y vector objetivo (y)
    X = np.array([item['valores'] for item in data])
    # Estandarizamos las etiquetas a booleanos para evitar conflictos (True=Anomalía)
    y = np.array([bool(item['label']) for item in data])
    
    k_folds_reales = min(k_folds, len(X))
    if k_folds_reales < 2:
        return None 

    n_vecinos = min(3, len(X) - 1)
    if n_vecinos < 1:
        n_vecinos = 1

    # Estimamos la proporción real de anomalías para calibrar IF y LOF
    proporcion_anomalias = sum(y) / len(y) if sum(y) > 0 else 0.05
    contaminacion = max(0.01, min(0.49, proporcion_anomalias)) # Limite seguro

    # --- ALGORITMO 1: KNN (K-Nearest Neighbors) ---
    modelo_knn = KNeighborsClassifier(n_neighbors=n_vecinos)
    kf = KFold(n_splits=k_folds_reales, shuffle=True, random_state=42)
    y_pred_knn = cross_val_predict(modelo_knn, X, y, cv=kf)

    # --- ALGORITMO 2: Isolation Forest ---
    iso_forest = IsolationForest(contamination=contaminacion, random_state=42)
    preds_if = iso_forest.fit_predict(X)
    # Scikit-Learn devuelve -1 para anomalía y 1 para normal. Lo mapeamos a True/False.
    y_pred_if = np.array([True if p == -1 else False for p in preds_if])

    # --- ALGORITMO 3: Local Outlier Factor (LOF) ---
    lof = LocalOutlierFactor(n_neighbors=n_vecinos, contamination=contaminacion)
    preds_lof = lof.fit_predict(X)
    y_pred_lof = np.array([True if p == -1 else False for p in preds_lof])

    # Construimos y retornamos el JSON comparativo
    return {
        'KNN': calcular_metricas(y, y_pred_knn),
        'IsolationForest': calcular_metricas(y, y_pred_if),
        'LOF': calcular_metricas(y, y_pred_lof)
    }