# Eventos informativos

Se reutiliza Event. mode diferencia MANAGED (predeterminado para filas existentes) e INFORMATIONAL; source INVICTUS/EXTERNAL sigue representando origen y revisión.

El ADMIN existente crea eventos informativos desde Eventos informativos, sin Team, membresía, perfil básico ni configuración de inscripción. Se reutilizan EventForm, ManageEvents y endpoints /api/events/manage. El registro conserva createdByUserId y organizerId para creador y gestión; publicOrganizerName describe al organizador real, aunque no tenga cuenta. externalUrl admite HTTP/HTTPS sin credenciales. La modalidad no se cambia mediante edición.

Publicar requiere organizador, enlace y fecha futura. Despublicar retorna a DRAFT y oculta ficha y catálogo. La ficha publicada es anónima y muestra el CTA externo; no ofrece inscripción interna. El backend bloquea inscripción, y Mis eventos excluye informativos. Los eventos gestionados y los permisos de Teams conservan su funcionamiento.

Migración 20261002028_informational_events: tres columnas en events, modalidad válida y ausencia de Team en informativos. Sin tablas nuevas ni cambios destructivos. Aplicada en bases locales invictus e invictus_test; cliente generado. En producción aplicar esta migración antes de desplegar el backend que consulta los campos. No se desplegó producción.

Verificación: tests/event-teams.test.js, tests/event-setup.test.js, tests/category-registrations.test.js; npm run build; node --env-file=.env scripts/check-informational-events-ui.js sobre invictus_test local. El script monta frontend público y admin con sus archivos públicos reales y comprueba panel desktop/mobile, ficha anónima, enlace y despublicación.

Home y pagos personales se resuelven en incrementos posteriores. No hay borrado de eventos en esta entrega.
