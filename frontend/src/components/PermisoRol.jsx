import React from 'react';

// Este componente recibe el rol del usuario actual, el rol que se requiere para ver el contenido, y el contenido en sí (children)
const PermisoRol = ({ rolUsuarioActual, rolRequerido, children }) => {
  // Si el usuario actual tiene el rol que necesitamos (ej. 'docente'), mostramos el contenido
  if (rolUsuarioActual === rolRequerido) {
    return <>{children}</>;
  }
  
  // Si no es el rol requerido, no mostramos nada (null)
  return null;
};

export default PermisoRol;