from rest_framework import serializers
from .models import Cultivo, UnidadCultivo, Experimento, Variable, Valor, Tratamiento

class CultivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cultivo
        fields = '__all__'

class UnidadCultivoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadCultivo
        fields = '__all__'

class ExperimentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Experimento
        fields = '__all__'
        read_only_fields = ('usuario',)

class VariableSerializer(serializers.ModelSerializer):
    class Meta:
        model = Variable
        fields = '__all__'

class ValorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Valor
        fields = '__all__'

class TratamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tratamiento
        fields = '__all__'