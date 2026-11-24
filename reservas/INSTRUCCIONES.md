# Activar ENTRADAS — Integilentes / Recontra Pavos

> **Estado:** preparado en la rama de desarrollo, **no habilitado** para recibir datos personales hasta completar la conexión y las pruebas.

## Qué hace

1. Una función (lunes, miércoles o viernes) se anuncia con fecha, hora y **hasta 3 cupos** por defecto.
2. Una persona solicita **una entrada**, declarando que está suscrita a Recontra Pavos y autorizando el uso de sus datos para coordinar la asistencia.
3. Si hay cupo, se crea una fila **PENDIENTE** y el cupo se bloquea. Se envía un aviso al correo de administración definido **privadamente** en Apps Script.
4. El equipo contacta a la persona por teléfono, explica las condiciones y verifica su aceptación. Solamente entonces cambia el estado en la hoja privada a **CONFIRMADA**.
5. Las solicitudes que aún estén **PENDIENTES** se cambian automáticamente a **LIBERADA** al llegar a las 72 horas previas a la función. No se afecta a las confirmadas.
6. Si se cancela una entrada, cambia el estado manualmente a **CANCELADA** para devolver ese cupo. El sistema impide que haya más solicitudes vigentes que cupos, usando un bloqueo transaccional.
7. El panel público solo expone la función y los cupos; **los nombres, correos y teléfonos nunca se suben a GitHub**.

**Política inicial de seguridad:** las solicitudes nuevas se cierran 72 horas antes de empezar cada función. Si el organizador quiere mantener el formulario abierto después de ese corte, primero hay que definir qué duración tendrá un bloqueo nuevo: de lo contrario una solicitud quedaría liberada inmediatamente.

## Configuración de Google Sheets y Apps Script

Se necesita acceso al correo de administración en una **cuenta de Google**; no hay que compartir contraseñas.

1. En esa cuenta, crea una hoja de cálculo de Google Sheets llamada \`Recontra Pavos - Entradas\`. Mantén su acceso **Restringido**; no la compartas con asistentes.
2. En la hoja ve a **Extensiones → Apps Script**, copia el contenido de \`reservas/apps-script.gs\` en el editor y guarda.
3. Ejecuta la función \`setup\` desde el editor y acepta los permisos de Google. Se crearán las hojas privadas **Funciones** y **Reservas**, así como la tarea horaria que libera pendientes.
4. En el editor abre **Configuración del proyecto → Propiedades del script → Añadir propiedad**, usa la clave \`ADMIN_EMAIL\` y escribe el correo del organizador. **No pongas ese correo en el HTML ni en el repositorio.**
5. Regresa a la pestaña **Funciones** e introduce, en una nueva fila, columnas:
   - \`evento_id\`: por ejemplo \`integilentes-2026-11-27\`.
   - \`fecha_iso\`: fecha y hora con zona horaria peruana, en **texto sin formato**: \`2026-11-27T16:00:00-05:00\` (solo ejemplo; confirma siempre la fecha y la hora reales).
   - \`titulo\`: \`Integilentes — Función de viernes\`.
   - \`cupos\`: \`3\`.
   - \`activo\`: \`SI\`.
6. En Apps Script: **Implementar → Nueva implementación → Aplicación web**; ejecución **como tú** y acceso **Cualquier persona**. Autoriza. Copia la URL que termina en \`/exec\`.
7. En GitHub, edita \`data/entradas-config.json\` e introduce esa URL en \`apiUrl\`, respetando las comillas. La URL es pública, **no** es una contraseña. No compartas nunca tu sesión Google ni el enlace a la hoja de cálculo.
8. Prueba con una función futura, simulando **tres solicitudes** con distintos teléfonos/correos y verifica que:
   - cada solicitud aparece como **PENDIENTE**;
   - los cupos disminuyen hasta cero;
   - el correo del organizador recibe el aviso;
   - la cuarta solicitud recibe un rechazo por falta de entradas;
   - al editar el estado a **CANCELADA** se devuelve el cupo;
   - al editar a **CONFIRMADA**, la solicitud sigue ocupando un cupo;
   - las pendientes vencen al llegar al corte de 72 horas.
9. Solo después de probar, publica la rama en \`main\` para que la sección esté disponible en \`www.recontrapavos.com\`.

## Administración del día a día

- **PENDIENTE**: se recibió formulario, cupo bloqueado; todavía **no** hay entrada confirmada.
- **CONFIRMADA**: el organizador llamó, explicó las condiciones y la persona las aceptó.
- **CANCELADA**: cancelada manualmente, cupo devuelto.
- **LIBERADA**: no se confirmó antes del corte de 72 horas; cupo devuelto.

**No cambies** manualmente las columnas \`codigo\`, \`evento_id\` ni \`solicitada_en\`; edita solo \`estado\` para confirmar o cancelar.

## Privacidad y consideraciones antes de abrir al público

- Se recopilan nombre, apellido, email y teléfono, y un consentimiento para coordinar la reserva.
- Si asistirán menores, define antes una política de acompañamiento/autorización de madre, padre o tutor, así como permisos explícitos de grabación y uso de imagen.
- Publica un aviso de privacidad completo conforme a la normativa peruana antes de activar las solicitudes; el texto breve del formulario no reemplaza ese aviso.
- Añade protección contra solicitudes automáticas y pruebas del sistema antes de una convocatoria masiva: el formulario incluye un campo trampa y detección de duplicados, **pero no es una solución antispam completa**.
- No publiques la hoja de Google Sheets ni pases el correo a código HTML público.
- No incluyas en la web la dirección exacta del estudio sin decidir antes si se enviará solo a asistentes confirmados.

## Archivos
- \`index.html\`: sección de entradas, estilo del sitio y enlace de navegación.
- \`tickets.js\`: consulta pública de cupos y formulario de solicitudes.
- \`data/entradas-config.json\`: URL del backend (vacía hasta que se active).
- \`reservas/apps-script.gs\`: servicio de cupos, notificaciones y vencimientos en Apps Script.
