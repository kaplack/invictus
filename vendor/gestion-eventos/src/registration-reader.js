import { requirePort } from '@base/usuarios-acceso/contracts';
import { EventError } from './errors.js';

// Configuración del consumidor, nunca tomada del body de una inscripción.
export function createRegistrationEventReader({ store, resolveConfig }) {
  requirePort(store, ['events.get'], 'store');
  if (typeof resolveConfig !== 'function') throw new TypeError('resolveConfig es obligatorio');
  return {
    async get(id) {
      const event = await store.events.get(id);
      if (!event) return null;
      const config = await resolveConfig(event.id);
      if (!config || !Number.isSafeInteger(config.amountCents) || config.amountCents < 0 || config.amountCents > 2000000000
        || !/^[A-Z]{3}$/.test(config.currency) || !(config.maxCapacity === null || Number.isSafeInteger(config.maxCapacity) && config.maxCapacity > 0)
        || (config.amountCents > 0 && (typeof config.paymentRecipientId !== 'string' || !config.paymentRecipientId.trim())))
        throw new EventError('Configura tarifa, moneda, cupo y destinatario del evento', 409, 'REGISTRATION_NOT_CONFIGURED');
      return { ...event, amountCents: config.amountCents, currency: config.currency,
        maxCapacity: config.maxCapacity, paymentRecipientId: config.amountCents ? config.paymentRecipientId : null };
    }
  };
}
