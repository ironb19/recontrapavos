/* Recontra Pavos — Reservas de público. No guarda datos de asistentes en GitHub. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const lista = $("rpFunciones");
  const formulario = $("rpReservaForm");
  const aviso = $("rpTicketMsg");
  const estado = $("rpTicketStatus");
  const seleccion = $("rpSeleccion");
  const boton = $("rpTicketSubmit");
  const iframe = $("rpTicketFrame");
  if (!lista || !formulario || !iframe) return;
  let configuracion = "";
  let funciones = [];
  let pendNonce = "";
  let pendienteTimeout = null;
  const formato = new Intl.DateTimeFormat("es-PE", {
    timeZone:"America/Lima", weekday:"long", day:"numeric",month:"long",year:"numeric",
    hour:"2-digit",minute:"2-digit",hour12:true
  });
  const mensaje = (texto,tipo="") => {
    aviso.textContent = texto;
    aviso.dataset.tipo = tipo;
    aviso.hidden = !texto;
  };
  const etiqueta = (e) => {
    const fecha = new Date(e.fecha);
    return Number.isNaN(fecha.valueOf()) ? e.titulo : formato.format(fecha);
  };
  function dibujar() {
    lista.replaceChildren();
    if (!funciones.length) {
      const p=document.createElement("p");
      p.className="rp-no-dates";
      p.textContent="Todavía no hay funciones habilitadas. Anunciaremos las próximas fechas por aquí.";
      lista.append(p);
      formulario.hidden=true;
      return;
    }
    funciones.forEach(e=>{
      const tarjeta=document.createElement("article");
      tarjeta.className="rp-ticket-card";
      const h=document.createElement("h3");h.textContent=e.titulo || "Integilentes";
      const fecha=document.createElement("p");fecha.className="rp-ticket-date";fecha.textContent=etiqueta(e);
      const plazas=document.createElement("p");plazas.className="rp-ticket-places";
      plazas.textContent = !e.abierto ? "Solicitudes cerradas" :
        e.disponibles>0 ? e.disponibles+" de "+e.total+" entradas disponibles" : "Entradas agotadas";
      const elegir=document.createElement("button");elegir.type="button";elegir.className="btn btn-dark";
      elegir.textContent="ELEGIR FUNCIÓN";
      elegir.disabled=!e.abierto || !e.disponibles;
      elegir.addEventListener("click",()=>{
        $("rpEventoId").value=e.id;
        seleccion.textContent="Función elegida: "+(e.titulo||"Integilentes")+" — "+etiqueta(e);
        formulario.hidden=false;
        mensaje("");
        formulario.scrollIntoView({behavior:"smooth",block:"start"});
      });
      tarjeta.append(h,fecha,plazas,elegir);lista.append(tarjeta);
    });
  }
  const pedirFunciones=() => {
    if (!configuracion) return;
    const antiguo = document.getElementById("rpEventoJSONP");
    if(antiguo) antiguo.remove();
    const s=document.createElement("script");
    s.id="rpEventoJSONP";
    s.src=configuracion+(configuracion.includes("?")?"&":"?")+"action=events&t="+Date.now();
    s.onerror=()=>{estado.textContent="No se pudo consultar la disponibilidad. Inténtalo de nuevo más tarde.";};
    document.head.appendChild(s);
  };
  window.rpTicketsReceive=respuesta=>{
    if (!respuesta?.ok || !Array.isArray(respuesta.funciones)) {
      estado.textContent="No pudimos consultar los cupos en este momento.";
      return;
    }
    funciones=respuesta.funciones;
    estado.textContent="Los cupos incluyen solicitudes pendientes de confirmación.";
    dibujar();
  };
  window.addEventListener("message", e=>{
    const d=e.data;
    if(!d || d.source!=="recontrapavos-entradas" || !pendNonce || d.nonce!==pendNonce) return;
    if(pendienteTimeout) clearTimeout(pendienteTimeout);
    pendNonce="";
    boton.disabled=false;
    boton.textContent="SOLICITAR ENTRADA";
    if (d.ok) {
      formulario.hidden=true;
      formulario.reset();
      mensaje("¡Solicitud registrada! Código "+d.codigo+". Tu entrada está PENDIENTE; aún no está confirmada. Te contactaremos por teléfono para explicarte las condiciones.","ok");
      aviso.scrollIntoView({behavior:"smooth",block:"center"});
      pedirFunciones();
    } else mensaje(d.error || "No se pudo registrar la solicitud. Revisa los datos.","error");
  });
  formulario.addEventListener("submit",e=>{
    e.preventDefault();
    if(!configuracion || pendNonce || !formulario.reportValidity()) return;
    pendNonce = (typeof crypto!=="undefined" && crypto.randomUUID)
      ? crypto.randomUUID() : "rp-"+Date.now()+"-"+Math.random().toString(36).slice(2,10);
    $("rpNonce").value=pendNonce;
    formulario.action=configuracion;
    formulario.method="post";
    formulario.target="rpTicketFrame";
    boton.disabled=true;
    boton.textContent="ENVIANDO...";
    mensaje("Enviando solicitud. No cierres esta ventana.");
    HTMLFormElement.prototype.submit.call(formulario);
    pendienteTimeout=setTimeout(()=>{
      if(!pendNonce)return;
      pendNonce="";
      boton.disabled=false;
      boton.textContent="SOLICITAR ENTRADA";
      mensaje("No pudimos comprobar la respuesta. Por favor, no envíes otra solicitud todavía: podrías haber bloqueado tu entrada. Contacta al organizador para comprobarla.","error");
    },30000);
  });
  fetch("data/entradas-config.json",{cache:"no-store"}).then(r=>r.ok?r.json():null)
    .then(datos=>{
      const url=typeof datos?.apiUrl==="string"?datos.apiUrl.trim():"";
      if(!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url)) {
        estado.textContent="Las solicitudes se habilitarán próximamente.";
        lista.innerHTML='<p class="rp-no-dates">Próximamente anunciaremos las funciones con entradas disponibles.</p>';
        return;
      }
      configuracion=url;
      estado.textContent="Consultando funciones...";
      pedirFunciones();
      setInterval(pedirFunciones,60000);
    }).catch(()=>{estado.textContent="Las solicitudes se habilitarán próximamente.";});
})();
