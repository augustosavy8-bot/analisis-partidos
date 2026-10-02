import Link from "next/link";

export const metadata = { title: "Términos y condiciones" };

// Texto base: revisalo con un abogado antes de usarlo con clientes reales.
export default function Terminos() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 text-stone-700">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Términos y condiciones</h1>
      <p className="mt-2 text-sm text-stone-500">Última actualización: octubre de 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section>
          <h2 className="font-semibold text-stone-900">1. Qué es Point</h2>
          <p>
            Point es un servicio para que los comercios lleven un programa de puntos con sus clientes: tarjeta digital, llaveros NFC para el
            personal, premios, promociones y mensajes. Estos términos aplican a los comercios que se registran y contratan el servicio. Para los
            clientes que suman puntos rige la <Link href="/privacidad" className="underline">política de privacidad</Link>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">2. Cuenta</h2>
          <p>
            Para usar Point hay que crear una cuenta con un email válido y datos verdaderos del comercio. Sos responsable de cuidar tu
            contraseña y de lo que se haga con tu cuenta y con los llaveros de tu personal.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">3. Suscripción, prueba gratis y cobro</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>El servicio se contrata por suscripción mensual con renovación automática, debitada por Mercado Pago de la tarjeta que cargues.</li>
            <li>
              Los planes, sus precios y lo que incluye cada uno se muestran dentro del panel antes de contratar. La primera suscripción de cada
              comercio incluye una prueba gratis (los días se indican al contratar); al terminar, se cobra el primer mes. La prueba gratis es una
              sola vez por comercio.
            </li>
            <li>Los precios están en pesos argentinos e incluyen los impuestos que correspondan.</li>
            <li>
              Si cambiamos el precio de tu plan, te avisamos con al menos 30 días de anticipación. Si no estás de acuerdo, podés cancelar antes de
              que rija.
            </li>
            <li>
              Cambio de plan: subir de plan es inmediato y el precio nuevo se cobra desde el próximo débito. Bajar de plan se aplica al terminar el
              período ya pagado. No hay cobros ni devoluciones proporcionales por los días del mes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">4. Pagos no acreditados</h2>
          <p>
            Si un débito no se puede cobrar, Mercado Pago lo reintenta durante algunos días. Mientras tanto el servicio sigue funcionando y te
            avisamos en el panel. Si el pago no se regulariza, primero se restringen funciones del panel y, después de un plazo adicional, se
            pausa la suma de puntos. Tus clientes siempre pueden canjear los puntos que ya ganaron.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">5. Baja y cancelación</h2>
          <p>
            Podés pausar o cancelar tu suscripción cuando quieras, en línea y sin trámites, desde <strong>Panel → Facturación → Cancelar
            suscripción</strong>. Al cancelar no se te cobra más y conservás el servicio hasta el final del período ya pagado. Si cancelás durante
            la prueba gratis, no se te cobra nada.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">6. Compra de llaveros y chips NFC</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Los productos, precios, costo de envío y punto de retiro se muestran antes de pagar.</li>
            <li>El stock se reserva por un tiempo limitado mientras se completa el pago en Mercado Pago.</li>
            <li>Los envíos se despachan después de acreditado el pago; te avisamos en el panel cuando sale o cuando está listo para retirar.</li>
            <li>
              Si un producto llega con fallas de fábrica, escribinos y lo cambiamos.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">7. Derecho de arrepentimiento</h2>
          <p>
            Tenés 10 días corridos para revocar una compra hecha en línea (desde que la hiciste o desde que recibiste el producto, lo que pase
            último), sin costo y sin dar explicaciones, como prevé el artículo 34 de la Ley 24.240 de Defensa del Consumidor. Pedilo desde el{" "}
            <Link href="/arrepentimiento" className="underline">botón de arrepentimiento</Link>: te damos un código de trámite al instante. Si
            recibiste productos, tenés que devolverlos sin uso; los gastos de devolución corren por nuestra cuenta.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">8. Uso correcto</h2>
          <p>
            No podés usar Point para enviar mensajes no deseados, para engañar a tus clientes ni para fines ilegales. Los datos de tus clientes
            los tratás según la Ley 25.326 y nuestra política de privacidad. Podemos suspender cuentas que hagan un uso abusivo del servicio.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">9. Disponibilidad</h2>
          <p>
            Trabajamos para que el servicio esté disponible siempre, pero puede haber interrupciones por mantenimiento o por fallas de
            proveedores (hosting, Mercado Pago, Google, Apple).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-stone-900">10. Contacto</h2>
          <p>
            Ante cualquier duda o reclamo escribinos desde <Link href="/sumate?modo=contacto" className="underline">el formulario de contacto</Link>.
            Rigen las leyes de la República Argentina.
          </p>
        </section>
      </div>
    </main>
  );
}
