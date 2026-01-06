# Claude Usage Monitor

<div align="center">

**🌐 Language / Langue / Idioma / 语言 / שפה**

[![English](https://img.shields.io/badge/English-blue?style=flat-square)](../README.md)
[![Français](https://img.shields.io/badge/Français-blue?style=flat-square)](README.fr.md)
[![Español](https://img.shields.io/badge/Español-orange?style=flat-square)](README.es.md)
[![中文](https://img.shields.io/badge/中文-blue?style=flat-square)](README.zh.md)
[![עברית](https://img.shields.io/badge/עברית-blue?style=flat-square)](README.he.md)

---

![Version](https://img.shields.io/badge/version-4.0-orange)
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
5. **Elegir tu metodo de autenticacion:**
   - **Auto (Cookie)**: Solo inicia sesion en claude.ai - la extension detecta tu sesion automaticamente!
   - **Manual (Token)**: Pega el contenido de tu `.credentials.json`

Eso es todo! La extension comenzara a monitorear tu uso.

## Caracteristicas

| Caracteristica | Descripcion |
|----------------|-------------|
| **Seguimiento en tiempo real** | Monitorea cuotas de 5 horas y 7 dias |
| **Progreso visual** | Hermosos indicadores de progreso circulares |
| **Codigo de colores** | Verde (< 50%), Naranja (50-80%), Rojo (> 80%) |
| **Alertas inteligentes** | Notificaciones al 70%, 80%, 90%, 95% de uso |
| **Actualizacion automatica** | Se actualiza automaticamente cada minuto |
| **Auth Cookie** | Deteccion automatica de sesion claude.ai - sin configuracion! |
| **Auth Token** | Configuracion manual con credentials.json |
| **Multi-idioma** | Ingles, Frances, Espanol, Chino, Hebreo |
| **Deteccion automatica** | Detecta automaticamente el idioma del navegador |
| **Tema oscuro** | Interfaz moderna disenada para desarrolladores |
| **Privacidad primero** | Todos los datos permanecen locales |

## Instalacion

### Opcion 1: Descargar desde Releases (Recomendado)

1. Ir a [Releases](https://github.com/showf68/claude-usage-monitor/releases/latest)
2. Descargar `claude-usage-monitor-v4.0.zip`
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

La extension soporta **dos metodos de autenticacion**:

### Opcion A: Modo Auto (Cookie) - Recomendado

La forma mas facil! Solo inicia sesion en [claude.ai](https://claude.ai) en Chrome.

1. Haz clic en el icono de la extension
2. Ve a **Configuracion** (icono de engranaje)
3. Selecciona la pestana **"Auto (Cookie)"**
4. Si ves "Sesion encontrada", haz clic en **"Conectar con sesion Claude.ai"**

Eso es todo! No se necesitan tokens ni archivos.

### Opcion B: Modo Manual (Token)

Usa esto si el modo cookie no funciona o prefieres control explicito.

#### Paso 1: Encontrar tus credenciales

| Plataforma | Ruta |
|------------|------|
| **Windows** | `%USERPROFILE%\.claude\.credentials.json` |
| **macOS** | `~/.claude/.credentials.json` |
| **Linux** | `~/.claude/.credentials.json` |

#### Paso 2: Copiar y Pegar

1. Abrir el archivo de credenciales en cualquier editor de texto
2. **Seleccionar todo** (Ctrl+A / Cmd+A)
3. **Copiar** (Ctrl+C / Cmd+C)
4. Hacer clic en el icono de la extension → Configuracion → pestana **"Manual (Token)"**
5. **Pegar** el contenido JSON completo
6. Hacer clic en **"Guardar y conectar"**

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

## Changelog

### v4.0 (Ultima)
- **Nuevo:** Modo de autenticacion por cookie - deteccion automatica de sesion claude.ai
- **Nuevo:** Dos modos de auth: Auto (Cookie) y Manual (Token)
- **Nuevo:** Pestanas en configuracion para cambiar de modo
- **Nuevo:** Indicador de estado de sesion para modo cookie
- **Nuevo:** Enlace a GitHub en el footer de la extension
- Configuracion simplificada - solo inicia sesion en claude.ai!

### v3.4
- **Fix:** El paquete ZIP ahora funciona correctamente en todos los sistemas

### v3.3
- **Nuevo:** Soporte multi-idioma (EN, FR, ES, ZH, HE)
- **Nuevo:** Deteccion automatica del idioma del navegador

## Privacidad y Seguridad

| Aspecto | Detalles |
|---------|----------|
| **Recopilacion de datos** | Ninguna - todos los datos permanecen locales |
| **Almacenamiento de tokens** | API de almacenamiento seguro de Chrome |
| **Llamadas de red** | Solo a las APIs oficiales de Anthropic |
| **Codigo abierto** | Codigo completo disponible para auditoria |

## Contribuir

**Este proyecto esta abierto a todos!** Damos la bienvenida a las contribuciones de la comunidad.

Las contribuciones son bienvenidas! Asi es como puedes participar:

1. Haz fork del repositorio
2. Crea una rama (`git checkout -b feature/mejora`)
3. Haz commit de tus cambios
4. Push a la rama
5. Abre un Pull Request

**Ideas de contribucion:**
- Nuevas funcionalidades
- Correccion de errores
- Mejoras de interfaz
- Nuevas traducciones
- Documentacion

## Licencia

Licencia MIT - ver [LICENSE](../LICENSE) para detalles.

---

<div align="center">

**Creado para la comunidad de desarrolladores de Claude**

**Unete al proyecto y contribuye!**

Si esta extension te ayuda, considera darle una estrella

[Reportar error](https://github.com/showf68/claude-usage-monitor/issues) | [Solicitar funcion](https://github.com/showf68/claude-usage-monitor/issues) | [Contribuir](https://github.com/showf68/claude-usage-monitor)

</div>
