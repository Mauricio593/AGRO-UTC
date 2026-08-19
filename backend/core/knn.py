import numpy as np
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.svm import SVC
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

def calcular_metricas(y_true, y_pred):
    """
    Calcula el diccionario de métricas estandarizado para cualquier algoritmo supervisado.
    """
    return {
        'accuracy': round(accuracy_score(y_true, y_pred) * 100, 2),
        'precision': round(precision_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'recall': round(recall_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'f1_score': round(f1_score(y_true, y_pred, average='weighted', zero_division=0) * 100, 2),
        'matriz_confusion': confusion_matrix(y_true, y_pred).tolist()
    }

def evaluar_modelos_vitrolab(data, k_folds=5):
    """
    Ejecuta y compara KNN, Árboles de Decisión y SVM.
    Retorna las métricas comparativas para el frontend.
    """
    # 1. Separar matriz de características (X) y vector objetivo (y)
    X = np.array([item['valores'] for item in data])
    y = np.array([item['label'] for item in data])
    
    k_folds_reales = min(k_folds, len(X))
    if k_folds_reales < 2:
        return None 

    n_vecinos = min(3, len(X) - 1)
    if n_vecinos < 1:
        n_vecinos = 1

    kf = KFold(n_splits=k_folds_reales, shuffle=True, random_state=42)

    # --- ALGORITMO 1: KNN (K-Nearest Neighbors) ---
    modelo_knn = KNeighborsClassifier(n_neighbors=n_vecinos)
    y_pred_knn = cross_val_predict(modelo_knn, X, y, cv=kf)

    # --- ALGORITMO 2: Árboles de Decisión ---
    modelo_tree = DecisionTreeClassifier(random_state=42)
    y_pred_tree = cross_val_predict(modelo_tree, X, y, cv=kf)

    # --- ALGORITMO 3: SVM (Support Vector Machine) ---
    modelo_svm = SVC(kernel='linear', random_state=42)
    y_pred_svm = cross_val_predict(modelo_svm, X, y, cv=kf)

    # Construimos y retornamos el JSON comparativo
    return {
        'KNN': calcular_metricas(y, y_pred_knn),
        'DecisionTree': calcular_metricas(y, y_pred_tree),
        'SVM': calcular_metricas(y, y_pred_svm)
    }