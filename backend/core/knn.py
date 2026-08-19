import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
from sklearn.model_selection import KFold, cross_val_predict
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
import warnings
import gc  # 1. Importamos el recolector de basura de Python

warnings.filterwarnings('ignore')

def calcular_metricas(y_true, y_pred):
    return {
        'accuracy': round(accuracy_score(y_true, y_pred) * 100, 2),
        'precision': round(precision_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'recall': round(recall_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'f1_score': round(f1_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'matriz_confusion': confusion_matrix(y_true, y_pred).tolist()
    }

# 2. Reducimos k_folds a 3 para disminuir la carga computacional
def evaluar_modelos_vitrolab(data, k_folds=3):
    """
    Ejecuta y compara modelos, optimizado para bajo consumo de memoria RAM.
    """
    # 3. Forzamos a que el tipo de dato sea float32 (mitad de memoria que float64)
    X = np.array([item['valores'] for item in data], dtype=np.float32)
    y = np.array([item['label'] for item in data])
    
    k_folds_reales = min(k_folds, len(X))
    if k_folds_reales < 2:
        return None 

    n_vecinos = min(3, len(X) - 1)
    if n_vecinos < 1:
        n_vecinos = 1

    kf = KFold(n_splits=k_folds_reales, shuffle=True, random_state=42)
    
    # Diccionario para almacenar los resultados y devolverlos al final
    resultados_metricas = {}

    # --- ALGORITMO 1: KNN ---
    modelo_knn = KNeighborsClassifier(n_neighbors=n_vecinos)
    y_pred_knn = cross_val_predict(modelo_knn, X, y, cv=kf)
    resultados_metricas['KNN'] = calcular_metricas(y, y_pred_knn)
    
    # 4. Eliminamos variables pesadas de KNN y limpiamos RAM
    del modelo_knn
    del y_pred_knn
    gc.collect() 

    # --- ALGORITMO 2: Árboles de Decisión ---
    modelo_tree = DecisionTreeClassifier(random_state=42)
    y_pred_tree = cross_val_predict(modelo_tree, X, y, cv=kf)
    resultados_metricas['DecisionTree'] = calcular_metricas(y, y_pred_tree)
    
    # 4. Eliminamos variables pesadas de Árboles y limpiamos RAM
    del modelo_tree
    del y_pred_tree
    gc.collect()

    # --- ALGORITMO 3: SVM ---
    modelo_svm = SVC(kernel='linear', random_state=42)
    y_pred_svm = cross_val_predict(modelo_svm, X, y, cv=kf)
    resultados_metricas['SVM'] = calcular_metricas(y, y_pred_svm)
    
    # 4. Eliminamos variables pesadas de SVM y limpiamos RAM
    del modelo_svm
    del y_pred_svm
    gc.collect()

    return resultados_metricas