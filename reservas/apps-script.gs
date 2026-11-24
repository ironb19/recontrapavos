/**
 * Backend de entradas para Recontra Pavos (Google Apps Script vinculado a Google Sheets).
 * Nunca publicar los datos personales en GitHub. Desplegar como aplicación web ejecutada como propietario.
 * Solo editar estados (PENDIENTE -> CONFIRMADA/CANCELADA) desde la hoja privada "Reservas".
 */
const EVENTOS = "Funciones";
const RESERVAS = "Reservas";
const CORTE_HORAS = 72;
const CABECERA_EVENTOS = ["evento_id", "fecha_iso", "titulo", "cupos", "activo"];
const CABECERA_RESERVAS = ["codigo", "evento_id", "nombres", "apellidos", "correo", "telefono", "suscriptor", "estado", "solicitada_en", "actualizada_en"];

function setup() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  for (const [nombre, cabecera] of [[EVENTOS,CABECERA_EVENTOS],[RESERVAS,CABECERA_RESERVAS]]) {
    let hoja = libro.getSheetByName(nombre);
    if (!hoja) hoja = libro.insertSheet(nombre);
    if (hoja.getLastRow() === 0) hoja.appendRow(cabecera);
    hoja.setFrozenRows(1);
  }
  const triggers = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === "limpiarPendientes");
  if (!triggers.length) ScriptApp.newTrigger("limpiarPendientes").timeBased().everyHours(1).create();
}

function hoja_(nombre) {
  const hoja = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nombre);
  if (!hoja) throw new Error("Primero ejecuta setup() desde Apps Script.");
  return hoja;
}
function filas_(nombre) {
  const hoja = hoja_(nombre);
  if (hoja.getLastRow() < 2) return [];
  return hoja.getRange(2,1,hoja.getLastRow()-1,hoja.getLastColumn()).getValues();
}
function eventos_() {
  return filas_(EVENTOS).filter(r => String(r[0]).trim()).map(r => ({
    id:String(r[0]).trim(),
    fecha:String(r[1]).trim(),
    titulo:String(r[2]).trim(),
    cupos:Number(r[3]) || 3,
    activo:String(r[4]).toLowerCase() === "si" || r[4] === true
  })).filter(e => Number.isFinite(new Date(e.fecha).getTime()));
}
function status_(codigo) {
  return String(codigo || "").trim().toUpperCase();
}
function limpiarPendientes_() {
  const reservas = hoja_(RESERVAS);
  const data = filas_(RESERVAS);
  const porId = Object.fromEntries(eventos_().map(e => [e.id,e]));
  let liberadas = 0;
  const ahora = Date.now();
  data.forEach((r,i) => {
    const ev = porId[String(r[1]).trim()];
    if (status_(r[7]) === "PENDIENTE" && ev && ahora >= new Date(ev.fecha).getTime() - CORTE_HORAS*3600000) {
      reservas.getRange(i+2,8).setValue("LIBERADA");
      reservas.getRange(i+2,10).setValue(new Date());
      liberadas++;
    }
  });
  return liberadas;
}
function limpiarPendientes() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { limpiarPendientes_(); }
  finally { lock.releaseLock(); }
}
function disponibilidad_() {
  const reservas = filas_(RESERVAS);
  const ahora = Date.now();
  return eventos_().filter(ev=>ev.activo && new Date(ev.fecha).getTime() > ahora)
    .map(ev => {
      const ocupados = reservas.filter(r => String(r[1]) === ev.id && ["PENDIENTE","CONFIRMADA"].includes(status_(r[7]))).length;
      return {
        id:ev.id, fecha:ev.fecha, titulo:ev.titulo, total:ev.cupos,
        disponibles:Math.max(0,ev.cupos - ocupados),
        abierto:ahora < new Date(ev.fecha).getTime()-CORTE_HORAS*3600000
      };
    }).sort((a,b) => new Date(a.fecha) - new Date(b.fecha));
}
function doGet(e) {
  try {
    limpiarPendientes();
    const salida = {ok:true, funciones:disponibilidad_()};
    return ContentService.createTextOutput("window.rpTicketsReceive("+JSON.stringify(salida)+");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } catch (error) {
    return ContentService.createTextOutput("window.rpTicketsReceive("+JSON.stringify({ok:false,funciones:[]})+");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}
function texto_(obj, clave, max) {
  return String(obj[clave] || "").trim().slice(0,max);
}
function reserva_(p) {
  if (texto_(p,"website",50)) throw new Error("Solicitud inválida.");
  const id = texto_(p,"evento_id",100);
  const nombres = texto_(p,"nombres",100);
  const apellidos = texto_(p,"apellidos",100);
  const correo = texto_(p,"correo",150).toLowerCase();
  const telefono = texto_(p,"telefono",25).replace(/[\s()-]/g,"");
  if (!id || !nombres || !apellidos) throw new Error("Completa tus nombres y apellidos.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new Error("Ingresa un correo válido.");
  if (!/^\+?[0-9]{9,15}$/.test(telefono)) throw new Error("Ingresa un teléfono válido.");
  if (p.suscriptor !== "si") throw new Error("Debes declarar que estás suscrito al canal.");
  if (p.privacidad !== "si") throw new Error("Debes aceptar el uso de datos para coordinar la asistencia.");
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    limpiarPendientes_();
    const ev = eventos_().find(x => x.id === id && x.activo);
    if (!ev) throw new Error("Esta función no está disponible.");
    if (Date.now() >= new Date(ev.fecha).getTime() - CORTE_HORAS*3600000) throw new Error("Las solicitudes para esta función están cerradas.");
    const reservas = filas_(RESERVAS);
    if (reservas.some(r=>String(r[1])===id &&
      (String(r[4]).trim().toLowerCase()===correo || String(r[5]).replace(/[\s()-]/g,"")===telefono)
      && ["PENDIENTE","CONFIRMADA"].includes(status_(r[7])))) {
      throw new Error("Ya existe una solicitud vigente con esos datos para esta función.");
    }
    const ocupados = reservas.filter(r => String(r[1]) === id && ["PENDIENTE","CONFIRMADA"].includes(status_(r[7]))).length;
    if (ocupados >= ev.cupos) throw new Error("Ya no quedan entradas disponibles.");
    const codigo = "RP-" + Utilities.getUuid().slice(0,8).toUpperCase();
    const ahora = new Date();
    hoja_(RESERVAS).appendRow([codigo,id,nombres,apellidos,correo,telefono,"SI","PENDIENTE",ahora,ahora]);
    return {codigo,correo,telefono,nombres,apellidos,evento:ev};
  } finally { lock.releaseLock(); }
}
function respuesta_(respuesta) {
  // El mensaje contiene solamente el estado y código, jamás los datos personales.
  const json = JSON.stringify({source:"recontrapavos-entradas",...respuesta})
    .replace(/</g,"\\u003c");
  const html = '<!doctype html><html><body><script>window.top.postMessage('+json+',"*");</scr'+'ipt></body></html>';
  return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function doPost(e) {
  const nonce = texto_(e.parameter || {},"nonce",100);
  if (!/^[a-z0-9-]{12,100}$/i.test(nonce)) return respuesta_({ok:false,nonce,error:"Solicitud inválida."});
  try {
    const registro = reserva_(e.parameter);
    const admin = PropertiesService.getScriptProperties().getProperty("ADMIN_EMAIL");
    if (admin) {
      try {
        MailApp.sendEmail({
          to:admin, subject:"Nueva solicitud pendiente " + registro.codigo,
          body:"Nueva solicitud PENDIENTE para Integilentes.\n\n"+
            "Código: "+registro.codigo+"\nFunción: "+registro.evento.titulo+"\nFecha: "+registro.evento.fecha+
            "\nNombres: "+registro.nombres+" "+registro.apellidos+"\nCorreo: "+registro.correo+
            "\nTeléfono: "+registro.telefono+"\n\nContacta a esta persona y, una vez que acepte las condiciones, cambia el estado a CONFIRMADA en la hoja privada. Nunca compartas esta hoja públicamente."
        });
      } catch (err) { console.error("Error enviando aviso: "+err.message); }
    }
    return respuesta_({ok:true,nonce,codigo:registro.codigo});
  } catch(err) {
    return respuesta_({ok:false,nonce,error:String(err.message || "No se pudo registrar la solicitud.").slice(0,200)});
  }
}
