# Unit Turnover Tracker — Guía de Sincronización y Despliegue en GitHub

Este sistema de gestión de operaciones de mantenimiento y entrega de departamentos está completamente preparado para **sincronizarse en tiempo real entre tu PC y tu teléfono celular**.

---

## ⚡ ¿Cómo funciona la sincronización PC ↔ Teléfono?

1. **Base de Datos en la Nube (Firebase Firestore)**:
   - Toda la información de las 4 unidades (#1001, #1002, #1003, #1004), las fichas de las 6 disciplinas (Plomería, Electricidad, HVAC, Pintura, Pisos, Limpieza), fotos, firmas de entrega y órdenes de trabajo se sincronizan automáticamente a través de la nube.
   - Las reglas de seguridad de Firestore ya están activas y permiten lectura y escritura instantánea en tiempo real.
2. **Escuchadores en Tiempo Real (`onSnapshot`)**:
   - Cuando marcas una tarea o tomas una foto en el celular, la pantalla de tu PC se actualiza de inmediato sin necesidad de recargar la página.
   - Si creas una nueva orden de trabajo en la PC, aparece al instante en el celular del técnico en el campo.
3. **Modo Fuera de Línea / "Dead Zone"**:
   - Si entras a un sótano o departamento sin señal celular, el app guarda tus cambios localmente en IndexedDB.
   - En cuanto el teléfono vuelve a tener conexión (o desactivas la simulación de zona muerta), la cola de sincronización sube automáticamente todos los registros pendientes al servidor central.

---

## 🚀 Cómo subir el proyecto a GitHub y activar GitHub Pages

Puedes subirlo directamente a tu cuenta de GitHub siguiendo estos pasos sencillos:

### Opción A: Subir con Git (Línea de comandos)

1. En tu terminal o consola en la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Unit Turnover Tracker with real-time sync"
   ```
2. Crea un repositorio en tu cuenta de GitHub (por ejemplo, `unit-turnover-tracker`).
3. Conéctalo y súbelo:
   ```bash
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/unit-turnover-tracker.git
   git push -u origin main
   ```

### Opción B: Exportar como ZIP desde Google AI Studio
1. En el menú superior derecho de Google AI Studio, haz clic en los tres puntos `...` o en el menú de ajustes y selecciona **"Export to ZIP"** o **"Export to GitHub"**.
2. Sube la carpeta a tu repositorio de GitHub.

---

## 🌐 Cómo activar GitHub Pages (Para abrirlo en tu celular)

Una vez subido a GitHub:

1. Ve a tu repositorio en GitHub y haz clic en **Settings** (Configuración) > **Pages** (pestaña en el menú izquierdo).
2. En **Build and deployment** > **Source**:
   - Selecciona **"Deploy from a branch"**.
   - En **Branch**, selecciona `main` y en la carpeta elige **/docs** (la carpeta `docs/` ya contiene la versión compilada lista para producción con rutas relativas `./`).
   - Haz clic en **Save** (Guardar).
3. En 1-2 minutos, GitHub te entregará tu URL pública, por ejemplo:
   `https://TU_USUARIO.github.io/unit-turnover-tracker/`

---

## 📱 Cómo conectar tu Teléfono Celular

1. **Con el Código QR Integrado**:
   - Abre la aplicación en tu PC.
   - En la barra superior, haz clic en el botón con el ícono de teléfono y código QR **"CONNECT PHONE"** (o **"QR SYNC"**).
   - Apunta la cámara de tu smartphone al código QR que aparece en pantalla.
   - Toca el enlace emergente para abrir la aplicación directamente en tu navegador móvil.
2. **Como Aplicación Móvil (PWA)**:
   - En Safari (iPhone): Presiona el botón Compartir y elige **"Agregar a pantalla de inicio"** (Add to Home Screen).
   - En Chrome (Android): Toca el menú de tres puntos y elige **"Instalar aplicación"** o **"Agregar a la pantalla principal"**.
   - Se comportará como una app nativa a pantalla completa con acceso rápido para los técnicos en terreno.

---

## 👥 Roles y Empleados de Mantenimiento

En la esquina superior derecha puedes alternar de usuario en cualquier momento:
- **Dave Jenkins** (Supervisor de Mantenimiento - Firma final y aprobación Rent Ready)
- **Sarah Vance** (Supervisora de Operaciones)
- **Carlos Mendez** (Técnico de Plomería & HVAC)
- **Elena Rostova** (Técnica de Pintura & Punch-out)
- **Robert Alonso**, **Teo Wissel**, **Mike Robinson** (Técnicos de Campo)

¡Todo cambio de estado o checklist completado por cualquier miembro del equipo queda registrado con su nombre, hora y fecha en el Registro de Campo en vivo!
