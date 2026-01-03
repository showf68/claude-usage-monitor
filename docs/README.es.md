# Claude Usage Monitor

<div align="center">

**🌐 Language / Langue / Idioma / 语言 / שפה**

[![English](https://img.shields.io/badge/English-blue?style=flat-square)](../README.md)
[![Français](https://img.shields.io/badge/Français-blue?style=flat-square)](README.fr.md)
[![Español](https://img.shields.io/badge/Español-orange?style=flat-square)](README.es.md)
[![中文](https://img.shields.io/badge/中文-blue?style=flat-square)](README.zh.md)
[![עברית](https://img.shields.io/badge/עברית-blue?style=flat-square)](README.he.md)

---

![Version](https://img.shields.io/badge/version-3.3-orange)
![Chrome](https://img.shields.io/badge/Chrome-Extension-brightgreen)
![Manifest](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

**Monitorea tu uso de Claude Code con hermosos indicadores circulares de progreso**

[Inicio Rapido](#inicio-rapido) | [Instalacion](#instalacion) | [Caracteristicas](#caracteristicas) | [Solucion de Problemas](#solucion-de-problemas)

</div>

---

## Descripcion

Claude Usage Monitor es una extension de Chrome que muestra tu uso de la API de Claude en tiempo real. Rastrea tus limites de 5 horas y 7 dias de un vistazo, recibe alertas antes de alcanzar tu cuota.

**Perfecto para usuarios de Claude Code y Claude Max.**

## Inicio Rapido

1. **Descargar** el [ultimo ZIP](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. **Extraer** el archivo ZIP
3. **Abrir** `chrome://extensions/` y activar el Modo Desarrollador
4. **Hacer clic** en "Cargar extension sin empaquetar" y seleccionar la carpeta
5. **Copiar** el contenido de tu `.credentials.json` y pegarlo en la extension

Eso es todo. La extension analizara automaticamente tus tokens y comenzara a monitorear.

## Caracteristicas

| Caracteristica | Descripcion |
|----------------|-------------|
| **Seguimiento en tiempo real** | Monitorea cuotas de 5 horas y 7 dias |
| **Progreso visual** | Hermosos indicadores de progreso circulares |
| **Codigo de colores** | Verde (< 50%), Naranja (50-80%), Rojo (> 80%) |
| **Alertas inteligentes** | Notificaciones al 70%, 80%, 90%, 95% de uso |
| **Actualizacion automatica** | Se actualiza automaticamente cada minuto |
| **Multi-idioma** | Ingles, Frances, Espanol, Chino, Hebreo |
| **Deteccion automatica** | Detecta automaticamente el idioma del navegador |
| **Configuracion facil** | Solo pega tus credenciales JSON |
| **Tema oscuro** | Interfaz moderna disenada para desarrolladores |
| **Privacidad primero** | Todos los datos permanecen locales |

## Instalacion

### Opcion 1: Descargar desde Releases (Recomendado)

1. Ir a [Releases](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. Descargar `claude-usage-monitor-v3.3.zip`
3. Extraer el ZIP en una carpeta
4. Abrir Chrome e ir a `chrome://extensions/`
5. Activar el **Modo Desarrollador** (boton arriba a la derecha)
6. Hacer clic en **"Cargar extension sin empaquetar"**
7. Seleccionar la carpeta extraida

### Opcion 2: Clonar Repositorio

```bash
git clone https://github.com/showf68/claude-usage-monitor.git
cd claude-usage-monitor
```

Luego cargar la carpeta en Chrome como se describe arriba.

## Configuracion

### Paso 1: Encontrar tus credenciales

Tus credenciales de Claude estan almacenadas en:

| Plataforma | Ruta |
|------------|------|
| **Windows** | `%USERPROFILE%\.claude\.credentials.json` |
| **macOS** | `~/.claude/.credentials.json` |
| **Linux** | `~/.claude/.credentials.json` |

### Paso 2: Copiar y Pegar

1. Abrir el archivo de credenciales en cualquier editor de texto
2. **Seleccionar todo** (Ctrl+A / Cmd+A)
3. **Copiar** (Ctrl+C / Cmd+C)
4. Hacer clic en el icono de la extension en Chrome
5. **Pegar** el contenido JSON completo
6. Hacer clic en **"Guardar y conectar"**

La extension extrae automaticamente el `accessToken` y `refreshToken` de tu JSON.

## Uso

### Insignia de la barra de herramientas

La insignia muestra tu porcentaje de uso actual de 5 horas:

| Insignia | Color | Estado |
|----------|-------|--------|
| `25` | Verde | Uso bajo |
| `65` | Naranja | Uso moderado |
| `90` | Rojo | Uso alto - reduce la velocidad! |
| `CFG` | Amarillo | Configuracion necesaria |
| `ERR` | Rojo | Error de conexion |

### Interfaz emergente

Haz clic en el icono de la extension para ver:
- **Uso de 5 horas** - Ventana actual con progreso circular
- **Uso de 7 dias** - Seguimiento de cuota semanal
- **Temporizador de reinicio** - Tiempo hasta que se renueven los limites
- **Ultima actualizacion** - Cuando se actualizaron los datos por ultima vez

## Solucion de Problemas

<details>
<summary><b>Insignia ERR o "Error de conexion"</b></summary>

1. Verifica tu conexion a internet
2. Verifica que tu token no haya expirado
3. Intenta reconfigurar con credenciales nuevas
4. Recarga la extension desde `chrome://extensions/`
</details>

<details>
<summary><b>Insignia CFG</b></summary>

La extension necesita configuracion:
1. Haz clic en el icono de la extension
2. Pega el contenido de tu `.credentials.json`
3. Haz clic en "Guardar y conectar"
</details>

## Privacidad y Seguridad

| Aspecto | Detalles |
|---------|----------|
| **Recopilacion de datos** | Ninguna - todos los datos permanecen locales |
| **Almacenamiento de tokens** | API de almacenamiento seguro de Chrome |
| **Llamadas de red** | Solo a las APIs oficiales de Anthropic |
| **Codigo abierto** | Codigo completo disponible para auditoria |

## Licencia

Licencia MIT - ver [LICENSE](LICENSE) para detalles.

---

<div align="center">

**Creado para la comunidad de desarrolladores de Claude**

Si esta extension te ayuda, considera darle una estrella

[Reportar error](https://github.com/showf68/claude-usage-monitor/issues) | [Solicitar funcion](https://github.com/showf68/claude-usage-monitor/issues)

</div>
