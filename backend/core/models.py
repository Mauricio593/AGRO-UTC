from django.db import models
from django.contrib.auth.models import AbstractUser

# ===============================
# 👤 USUARIO PROFESIONAL
# ===============================
class Usuario(AbstractUser):
    ROLES = (
        ('docente', 'Docente'),
        ('estudiante', 'Estudiante'),
    )
    rol = models.CharField(max_length=20, choices=ROLES)

# ===============================
# 🌿 CULTIVO (Catálogo Maestro)
# ===============================
class Cultivo(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nombre

# ===============================
# 🌱 UNIDAD (LOTE)
# ===============================
class UnidadCultivo(models.Model):
    nombre = models.CharField(max_length=100)
    cultivo = models.ForeignKey(Cultivo, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('nombre', 'cultivo')
        
    def __str__(self):
        return f"{self.cultivo} - {self.nombre}"

# ===============================
# 📅 EXPERIMENTO (AÑO Y CONTEXTO)
# ===============================
class Experimento(models.Model):
    anio = models.IntegerField()
    unidad = models.ForeignKey(UnidadCultivo, on_delete=models.CASCADE)
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ('unidad', 'anio')
        
    def __str__(self):
        return f"Exp {self.anio} - {self.unidad}"

# ===============================
# 📊 VARIABLE (Catálogo Maestro)
# ===============================
class Variable(models.Model):
    nombre = models.CharField(max_length=100, unique=True)
    
    def __str__(self):
        return self.nombre

# ===============================
# 🧾 TRATAMIENTO (Catálogo Maestro)
# ===============================
class Tratamiento(models.Model):
    nombre = models.CharField(max_length=50, unique=True)
    
    def __str__(self):
        return self.nombre

# ===============================
# 📥 VALORES (La tabla que conecta todo)
# ===============================
class Valor(models.Model):
    experimento = models.ForeignKey(Experimento, on_delete=models.CASCADE)
    tratamiento = models.ForeignKey(Tratamiento, on_delete=models.CASCADE)
    variable = models.ForeignKey(Variable, on_delete=models.CASCADE)
    repeticion = models.IntegerField()
    planta = models.CharField(max_length=50, null=True, blank=True) 
    valor = models.FloatField()
    
    class Meta:
        unique_together = ('experimento', 'tratamiento', 'variable', 'repeticion', 'planta')
        
    def __str__(self):
        return f"{self.experimento.anio} | {self.tratamiento} | {self.variable}: {self.valor}"

# ===============================
# 🕒 HISTORIAL DE ACCESOS (NUEVO)
# ===============================
class HistorialLogin(models.Model):
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    fecha_ingreso = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.usuario.username} ingresó el {self.fecha_ingreso.strftime('%d/%m/%Y %H:%M')}"