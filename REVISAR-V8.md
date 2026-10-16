# Recontra Pavos — Revisión web V8

Esta rama contiene la versión V8 para revisar antes de publicarla.

## Incluye
- Inicio con el logo original de Recontra Pavos en movimiento.
- Bloque de Integilentes con logo más pequeño y horario **LUN · MIÉ · VIE | 4 PM**; sin reproductor incrustado ni franja amarilla.
- Tarjetas de programas: Integilentes y solo un cartel de **PRÓXIMAMENTE**.
- Fotografías del estudio, sin foto grupal.
- Versión para móvil, merchandising, comunidad y patrocinadores.
- Imágenes integradas dentro de `index.html`: no requieren una carpeta `assets` para esta versión.
- Conexión preparada para el último episodio por medio de `data/ultimo-episodio.json`.

## Pendiente para la publicación
1. Revisar y aprobar esta rama antes de fusionarla con `main`.
2. Configurar el secreto `YOUTUBE_API_KEY` en GitHub, habilitando YouTube Data API v3.
3. Una vez fusionada, activar y probar el workflow de GitHub Actions.
4. Comprobar la publicación de GitHub Pages y el dominio `recontrapavos.pe`.

**Esta rama no modifica ni elimina el archivo `CNAME` de la versión publicada.** La automatización se ejecutará periódicamente tras estar en la rama principal. GitHub puede retrasar los trabajos programados.
