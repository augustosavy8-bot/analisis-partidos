export const metadata = { title: "Política de privacidad" };

// Texto base: revisalo con un abogado antes de usarlo con clientes reales.
export default function Privacidad() {
  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 text-stone-700">
      <h1 className="text-2xl font-semibold tracking-tight text-stone-900">Política de privacidad</h1>
      <p className="mt-2 text-sm text-stone-500">Última actualización: septiembre de 2026</p>

      <div className="mt-8 space-y-6 leading-relaxed">
        <section>
          <h2 className="font-semibold text-stone-900">Qué datos guardamos</h2>
          <p>
            Tu nombre, tu número de WhatsApp, tu cumpleaños si lo cargás (sólo día y mes), la fecha en que aceptaste esta política, los puntos
            que sumás y canjeás en cada local (con fecha, hora y quién te atendió) y un
            identificador anónimo de tu celular para reconocerte sin pedirte contraseña.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-stone-900">Para qué los usamos</h2>
          <p>
            Para llevar tu tarjeta de puntos, validar tus premios, evitar fraudes y permitirte
            recuperar tu tarjeta si cambiás de celular. El local donde sumás puntos puede ver tu
            nombre, tu WhatsApp, tu cumpleaños y tu historial en ese local, y escribirte por
            WhatsApp para contarte de tus puntos, premios y promos. Si no querés recibir más
            mensajes, respondele al local y deja de escribirte.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-stone-900">Con quién los compartimos</h2>
          <p>
            No vendemos tus datos. Los guardamos en proveedores de infraestructura (base de datos y
            hosting) que los procesan por cuenta nuestra.
          </p>
        </section>
        <section>
          <h2 className="font-semibold text-stone-900">Tus derechos</h2>
          <p>
            Podés pedir acceso, corrección o eliminación de tus datos en cualquier momento, según la
            Ley 25.326 de Protección de Datos Personales. La Agencia de Acceso a la Información
            Pública es el órgano de control de esa ley.
          </p>
        </section>
      </div>
    </main>
  );
}
