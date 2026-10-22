-- Un mismo WhatsApp tiene tarjetas en varios locales. Si alguien escribe un número
-- que ya existe en un local donde ese cliente todavía no tiene tarjeta, ahora se le
-- crea la tarjeta (antes se bloqueaba). Como sin código por WhatsApp no sabemos si
-- es el dueño, ese celular queda "a verificar" un tiempo: canjear las tarjetas que
-- ya tenía la cuenta pide el PIN de alguien del local, y no puede borrar la cuenta.
alter table public.dispositivos add column verificar_hasta timestamptz;
