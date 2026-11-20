# Comparación visual del chatbot

Capturas obtenidas en Chromium mediante Playwright sirviendo la referencia v0 y NexusAI por HTTP local, no mediante dibujos ni imágenes generadas.

En las láminas: **izquierda = referencia v0; centro = implementación anterior rechazada; derecha = reconstrucción actual**. Las capturas individuales conservan su resolución original.

| Estado | Ventana / tema | Lámina |
|---|---|---|
| Bienvenida | 1440×900, claro | [Comparación](comparativa-light-1440-welcome.png) |
| Un intercambio | 1440×900, claro | [Comparación](comparativa-light-1440-messages.png) |
| Un intercambio | 375×900, oscuro | [Comparación](comparativa-dark-375-messages.png) |

Prefijos de archivos individuales: `v0-` (ZIP de referencia), `before-` (antes de reemplazar HTML), `after-` (después).

## Condiciones

- Mismo tamaño de ventana, tema y contenido del intercambio: «¿Cuáles son los horarios de atención?» con una respuesta Markdown fija.
- En bienvenida, ambos proyectos sin preguntas del usuario. La referencia no crea un hilo hasta enviar; NexusAI conserva la creación de sesión original.
- Se bloquean fuentes/CDN y proveedores externos para reproducibilidad, utilizando el mismo fallback tipográfico.
- Las FAQs de comparación y el intercambio son fixtures preparados en el navegador, no datos ni mocks importados al frontend productivo.
- En NexusAI se interceptó la lectura API para las capturas; `API disponible` describe esa respuesta del ensayo, no una validación de servidor real.
- La referencia tiene `En línea` fijo y acciones demo. La implementación final refleja conexión real y deshabilita valoración/regeneración sin soporte. No es una comparación funcional de backend.
- Se amplían controles a 44px y se conserva el aviso de datos sensibles; estas diferencias de seguridad/accesibilidad frente al ZIP son intencionadas.
- Se capturaron adicionalmente ambos estados/temas a 1440×900 y 375×900 en `/tmp/opencode/nexus-layout-comparison/`. Todas las páginas del ensayo terminaron sin excepciones JavaScript no capturadas.

Véase [el informe de reconstrucción](../../CHAT_LAYOUT_V0.md) para pruebas y límites.
