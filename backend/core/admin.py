from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario, Cultivo, UnidadCultivo, Experimento, Variable, Tratamiento, Valor

# ===============================
# 👤 USUARIO
# ===============================
@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Información Adicional', {'fields': ('rol',)}),
    )
    list_display = ('username', 'email', 'first_name', 'last_name', 'rol', 'is_staff')
    list_filter = ('rol', 'is_staff', 'is_active')

# ===============================
# 🌿 CULTIVO
# ===============================
@admin.register(Cultivo)
class CultivoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)

# ===============================
# 🌱 UNIDAD (LOTE)
# ===============================
@admin.register(UnidadCultivo)
class UnidadCultivoAdmin(admin.ModelAdmin):
    list_display = ('id', 'nombre', 'cultivo')
    list_filter = ('cultivo',)
    search_fields = ('nombre',)

# ===============================
# 📅 EXPERIMENTO
# ===============================
@admin.register(Experimento)
class ExperimentoAdmin(admin.ModelAdmin):
    list_display = ('id', 'anio', 'unidad', 'usuario')
    list_filter = ('anio', 'unidad__cultivo')

# ===============================
# 📊 VARIABLE
# ===============================
@admin.register(Variable)
class VariableAdmin(admin.ModelAdmin):
    # 🔧 CORREGIDO: Se eliminó 'experimento' de aquí
    list_display = ('id', 'nombre') 
    search_fields = ('nombre',)

# ===============================
# 🧾 TRATAMIENTO
# ===============================
@admin.register(Tratamiento)
class TratamientoAdmin(admin.ModelAdmin):
    # 🔧 CORREGIDO: Se eliminó 'experimento' de aquí
    list_display = ('id', 'nombre')
    search_fields = ('nombre',)

# ===============================
# 📥 VALORES
# ===============================
@admin.register(Valor)
class ValorAdmin(admin.ModelAdmin):
    # 🔧 ACTUALIZADO: Ahora muestra toda la información cruzada
    list_display = ('id', 'experimento', 'tratamiento', 'variable', 'repeticion', 'planta', 'valor')
    list_filter = ('experimento__anio', 'experimento__unidad__cultivo', 'tratamiento', 'variable')