import numpy as np
from sklearn.neighbors import KNeighborsClassifier

def entrenar_knn(data):
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
    return modelo.predict([nuevo])[0]