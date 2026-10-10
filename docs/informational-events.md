# Eventos informativos

Se reutiliza Event. mode diferencia MANAGED (predeterminado para filas existentes) e INFORMATIONAL; source INVICTUS/EXTERNAL sigue representando origen y revisión.

El ADMIN existente crea eventos informativos desde Eventos informativos, sin Team, membresía, perfil básico ni configuración de inscripción. Se reutilizan EventForm, ManageEvents y endpoints /api/events/manage. El registro conserva createdByUserId y organizerId para creador y gestión; publicOrganizerName describe al organizador real, aunque no tenga cuenta. externalUrl admite HTTP/HTTPS sin credenciales. La modalidad no se cambia mediante edición.

Publicar requiere organizador, enlace y fecha futura. Despublicar retorna a DRAFT y oculta ficha y catálogo. La ficha publicada es anónima y muestra el CTA externo; no ofrece inscripción interna. El backend bloquea inscripción, y Mis eventos excluye informativos. Los eventos gestionados y los permisos de Teams conservan su funcionamiento.

Migración 20261002028_informational_events: tres columnas en events, modalidad válida y ausencia de Team en informativos. Sin tablas nuevas ni cambios destructivos. Aplicada en bases locales invictus e invictus_test; cliente generado. En producción aplicar esta migración antes de desplegar el backend que consulta los campos. No se desplegó producción.

Verificación: tests/event-teams.test.js, tests/event-setup.test.js, tests/category-registrations.test.js; npm run build; node --env-file=.env scripts/check-informational-events-ui.js sobre invictus_test local. El script monta frontend público y admin con sus archivos públicos reales y comprueba panel desktop/mobile, ficha anónima, enlace y despublicación.

Home y pagos personales se resuelven en incrementos posteriores. No hay borrado de eventos en esta entrega.

## Información y contactos del organizador

El formulario informativo incluye los datos informativos del editor normal: concentración, fecha y salida, ubicación, imagen, entrega de kits con fechas y horario diario, instrucciones e imagen de ruta. Mantiene la inscripción externa y no configura cupos, categorías ni pagos internos. Reutiliza ImagePicker para validar y previsualizar imágenes públicas.

Organizador real y enlace siguen siendo obligatorios. Teléfono y correo son opcionales, se validan en el servidor y se muestran en la ficha pública solo cuando existen, con enlaces tel: y mailto:. Vaciar un contacto al editar lo elimina; omitirlo en una actualización parcial lo conserva.

Migración 20261007001_informational_organizer_contacts: añade dos columnas anulables sin modificar datos existentes. Aplicada en invictus e invictus_test locales; aplicar antes del despliegue en otros entornos. Build público y admin aprobado; verificación Edge a 1440/390 px aprobada para creación, edición, kits, ruta y ocultación de contactos vacíos. Prueba de logística aprobada. Las pruebas de event-teams se actualizaron para respetar el bloqueo de nombre y despublicación tras recibir inscripciones, y para comprobar el catálogo limitado a 100 registros sin depender del volumen acumulado de la base de pruebas. La compatibilidad con borradores históricos inscritos se comprueba explícitamente. Verificación conjunta: event-teams, event-logistics y personal-event-lifecycle, cinco pruebas aprobadas.
