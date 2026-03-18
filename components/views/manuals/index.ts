import { UserRole } from '../../../types';

export interface ManualStep {
    title: string;
    description: string;
    tip?: string;
    warning?: string;
}

export interface ManualSection {
    id: string;
    icon: string;
    title: string;
    steps: ManualStep[];
}

export interface RoleManual {
    role: UserRole;
    description: string;
    sections: ManualSection[];
}

// ─── VENDEDOR ────────────────────────────────────────────────────────────────
const sellerManual: RoleManual = {
    role: UserRole.SELLER,
    description: 'Como vendedor puedes crear y gestionar tus pedidos, seguir su estado y comunicarte con bodega.',
    sections: [
        {
            id: 'crear-pedido',
            icon: '📦',
            title: 'Crear un nuevo pedido',
            steps: [
                {
                    title: 'Accede a "Mis Pedidos"',
                    description: 'En el menú lateral (o barra inferior en móvil) selecciona "Mis Pedidos". Verás el botón "+ Nuevo Pedido" en la parte superior.',
                },
                {
                    title: 'Completa los datos del cliente',
                    description: 'Ingresa el nombre del cliente (obligatorio). Opcionalmente puedes agregar su RTN (máximo 14 dígitos) y teléfono de contacto.',
                },
                {
                    title: 'Selecciona el tipo de pedido y destino',
                    description: 'Elige el tipo (Venta, Degustación, Cambio, etc.) y el destino de entrega.',
                    tip: 'El tipo "Venta" es el más común y el que se reporta en los reportes de ventas.',
                },
                {
                    title: 'Agrega productos al carrito',
                    description: 'Selecciona el producto y la presentación (libra, medio galón, etc.). Ingresa la cantidad y presiona "Agregar". Repite para cada producto.',
                    tip: 'Puedes escribir la cantidad directamente en el campo de número. Para cantidades grandes, mantenme presionado el botón + para ir más rápido.',
                },
                {
                    title: 'Envía el pedido',
                    description: 'Una vez revisado el carrito, presiona "Enviar Pedido". El pedido quedará en estado "Enviado" y bodega lo recibirá.',
                    warning: 'Verifica el cliente y los productos antes de enviar. Una vez enviado, solo bodega puede hacer cambios.',
                },
            ],
        },
        {
            id: 'editar-pedido',
            icon: '✏️',
            title: 'Editar un pedido',
            steps: [
                {
                    title: 'Busca el pedido',
                    description: 'En "Mis Pedidos" verás la lista de tus pedidos. Solo los pedidos en estado "Borrador" o recién creados se pueden editar.',
                },
                {
                    title: 'Presiona el botón Editar',
                    description: 'Toca el ícono de lápiz (✏️) en el pedido que deseas modificar.',
                },
                {
                    title: 'Realiza los cambios',
                    description: 'Puedes cambiar el cliente, los productos y las cantidades. Cuando termines presiona "Guardar Cambios".',
                    warning: 'Si el pedido ya fue procesado por bodega (estado: En Revisión, Producción, etc.), ya no podrás editarlo desde aquí.',
                },
            ],
        },
        {
            id: 'estado-pedido',
            icon: '📊',
            title: 'Seguimiento del estado',
            steps: [
                {
                    title: 'Significado de cada estado',
                    description: [
                        '🟡 Enviado — Pedido recibido, bodega aún no lo ha revisado.',
                        '🔵 En Revisión — Bodega está verificando el pedido.',
                        '🟣 En Producción — El pedido está siendo preparado.',
                        '🟠 En Despacho — El producto está en camino con el repartidor.',
                        '🟢 Entregado — El cliente recibió su pedido.',
                        '🔴 Cancelado / Rechazado — El pedido fue cancelado.',
                    ].join('\n'),
                },
                {
                    title: 'Recibirás notificaciones',
                    description: 'Cada vez que bodega cambie el estado de tu pedido, recibirás una notificación en pantalla automáticamente.',
                    tip: 'Mantén la app abierta para recibir notificaciones en tiempo real.',
                },
            ],
        },
        {
            id: 'comentarios',
            icon: '💬',
            title: 'Ver comentarios de bodega',
            steps: [
                {
                    title: 'Botón de comentarios',
                    description: 'En cada pedido encontrarás un ícono de globo de texto (💬). Al tocarlo verás los comentarios que bodega ha dejado sobre ese pedido.',
                },
                {
                    title: 'Información importante',
                    description: 'Los comentarios son de solo lectura para el vendedor. Si bodega rechaza o modifica un pedido, aquí encontrarás la explicación.',
                },
            ],
        },
    ],
};

// ─── BODEGA ───────────────────────────────────────────────────────────────────
const warehouseManual: RoleManual = {
    role: UserRole.WAREHOUSE,
    description: 'Como usuario de Bodega gestionas el flujo de pedidos desde su recepción hasta el despacho al repartidor.',
    sections: [
        {
            id: 'ver-pedidos',
            icon: '📋',
            title: 'Ver y filtrar pedidos',
            steps: [
                {
                    title: 'Accede a "Gestión Pedidos"',
                    description: 'En el menú lateral selecciona "Gestión Pedidos". Verás todos los pedidos asignados a tu ciudad/bodega, ordenados del más reciente al más antiguo.',
                },
                {
                    title: 'Usa los filtros',
                    description: 'Presiona el botón "Filtros" para filtrar por estado, tipo de pedido, vendedor o rango de fechas.',
                    tip: 'El filtro de Estado es el más útil para ver solo los pedidos que requieren tu atención.',
                },
                {
                    title: 'Busca por nombre o ID',
                    description: 'Usa la barra de búsqueda para encontrar un pedido por ID (ej. ORD-042), nombre del cliente o vendedor.',
                },
            ],
        },
        {
            id: 'cambiar-estado',
            icon: '🔄',
            title: 'Cambiar estado de un pedido',
            steps: [
                {
                    title: 'Flujo recomendado de estados',
                    description: 'Enviado → En Revisión → En Producción → En Despacho → Entregado',
                },
                {
                    title: 'Usar los botones de acción',
                    description: 'En cada fila de pedido encontrarás botones de acción a la derecha. Presiona el estado al que deseas mover el pedido.',
                    tip: 'Solo aparecen los estados disponibles para la transición actual.',
                },
                {
                    title: 'Cancelar un pedido',
                    description: 'Usa el botón rojo "Cancelar" si necesitas rechazar el pedido. Se te pedirá un motivo obligatorio.',
                    warning: 'La cancelación no se puede deshacer. Asegúrate de estar seguro antes de confirmar.',
                },
            ],
        },
        {
            id: 'asignar-repartidor',
            icon: '🚚',
            title: 'Asignar repartidor y despachar',
            steps: [
                {
                    title: 'Asigna el repartidor',
                    description: 'En la columna "Repartidor" de cada pedido, selecciona el repartidor del menú desplegable. Solo aparecen los repartidores activos.',
                    warning: 'Si el repartidor está marcado como no disponible hoy, el sistema te alertará y no permitirá la asignación.',
                },
                {
                    title: 'El repartidor verifica la carga',
                    description: 'Una vez asignado, el repartidor verá el pedido en su pestaña "Por Verificar" y podrá confirmar que los productos están en su vehículo.',
                    tip: 'Coordina con el repartidor para asegurarte de que la carga esté completa.',
                },
                {
                    title: 'Cambia a "En Despacho"',
                    description: 'Cuando la carga esté confirmada y el repartidor listo para salir, presiona el botón "Despacho". El pedido aparecerá como "En Ruta" para el repartidor.',
                    warning: 'Un pedido en "Despacho" no se puede revertir a estados anteriores.',
                },
            ],
        },
        {
            id: 'exportar',
            icon: '📥',
            title: 'Exportar pedidos',
            steps: [
                {
                    title: 'Exportar a CSV',
                    description: 'Presiona el botón verde "Exportar CSV" en la parte superior. Se descargará un archivo Excel/CSV con los pedidos filtrados actualmente.',
                },
                {
                    title: 'Exportar a PDF',
                    description: 'Presiona el botón rojo "Exportar PDF" para obtener un reporte en formato PDF con los pedidos visibles.',
                    tip: 'Aplica los filtros que necesites antes de exportar para obtener solo los datos relevantes.',
                },
            ],
        },
    ],
};

// ─── PRODUCCIÓN ───────────────────────────────────────────────────────────────
const productionManual: RoleManual = {
    role: UserRole.PRODUCTION,
    description: 'Como usuario de Producción ves los pedidos que necesitan ser preparados y actualizas su estado de producción.',
    sections: [
        {
            id: 'ver-pedidos',
            icon: '📋',
            title: 'Ver pedidos de producción',
            steps: [
                {
                    title: 'Accede al Panel de Producción',
                    description: 'En el menú lateral selecciona "Gestión Pedidos". Verás los pedidos asignados a tu ciudad, excluyendo los que están en Borrador.',
                },
                {
                    title: 'Filtra por estado "En Producción"',
                    description: 'Usa el filtro de Estado para ver únicamente los pedidos que necesitan ser preparados (estado: En Producción).',
                },
                {
                    title: 'Vista consolidada',
                    description: 'Cambia a la pestaña "Consolidado" para ver el total de unidades de cada producto que necesitas preparar, sumando todos los pedidos pendientes.',
                    tip: 'El consolidado es ideal para planificar la producción del día.',
                },
            ],
        },
        {
            id: 'actualizar-estado',
            icon: '🔄',
            title: 'Actualizar estado de producción',
            steps: [
                {
                    title: 'Mover a producción',
                    description: 'Cuando un pedido en "En Revisión" esté listo para prepararse, presiona el botón "Producción" para moverlo al estado correspondiente.',
                },
                {
                    title: 'Marcar como listo para despacho',
                    description: 'Una vez preparado el pedido, presiona "Despacho" para indicar que está listo. Bodega se encargará de asignar el repartidor.',
                },
            ],
        },
    ],
};

// ─── ADMINISTRADOR ────────────────────────────────────────────────────────────
const adminManual: RoleManual = {
    role: UserRole.ADMIN,
    description: 'Como Administrador tienes acceso completo al sistema: usuarios, configuración, reportes y todas las funciones de bodega.',
    sections: [
        {
            id: 'usuarios',
            icon: '👥',
            title: 'Gestión de usuarios',
            steps: [
                {
                    title: 'Accede a "Usuarios"',
                    description: 'Desde el menú selecciona "Usuarios". Verás la lista de todos los empleados del sistema.',
                },
                {
                    title: 'Crear un nuevo usuario',
                    description: 'Completa el formulario en la parte superior: nombre, usuario, contraseña, roles (puedes seleccionar varios) y ciudad asignada. Presiona "Agregar".',
                    tip: 'Puedes asignar múltiples roles a un usuario marcando varias casillas en el selector de roles.',
                },
                {
                    title: 'Editar un usuario',
                    description: 'Presiona el ícono de lápiz (✏️) en la fila del usuario. Puedes cambiar nombre, contraseña, roles y ciudad. Para cambiar la contraseña, simplemente escribe la nueva.',
                    tip: 'Deja el campo de contraseña vacío si no deseas cambiarla.',
                },
                {
                    title: 'Desactivar un usuario',
                    description: 'Desmarca la casilla "Activo" en el formulario de edición. El usuario quedará inactivo y no podrá iniciar sesión.',
                    warning: 'No elimines usuarios con pedidos. Desactívalos para conservar el historial.',
                },
            ],
        },
        {
            id: 'disponibilidad',
            icon: '📅',
            title: 'Gestión de disponibilidad',
            steps: [
                {
                    title: 'Accede a "Disponibilidad"',
                    description: 'Desde el menú selecciona "Disponibilidad". Verás un calendario por cada repartidor.',
                },
                {
                    title: 'Marcar días no disponibles',
                    description: 'Selecciona las fechas en las que el repartidor estará ausente (vacaciones, permiso, etc.). Los días marcados aparecerán en rojo.',
                    tip: 'El sistema alertará automáticamente cuando intentes asignar un pedido a un repartidor no disponible.',
                },
            ],
        },
        {
            id: 'configuracion',
            icon: '⚙️',
            title: 'Configuración del sistema',
            steps: [
                {
                    title: 'Accede a "Configuración"',
                    description: 'Desde el menú selecciona "Configuración". Aquí puedes administrar los tipos de pedido, destinos y otras opciones del sistema.',
                },
                {
                    title: 'Tipos de pedido',
                    description: 'Agrega, edita o desactiva los tipos de pedido (Venta, Degustación, Cambio, etc.) según las necesidades del negocio.',
                },
            ],
        },
        {
            id: 'reportes',
            icon: '📊',
            title: 'Reportes y análisis',
            steps: [
                {
                    title: 'Accede a "Reportes"',
                    description: 'Desde el menú selecciona "Reportes". Verás gráficos y resúmenes de ventas, volúmenes y tendencias.',
                },
                {
                    title: 'Filtrar por período',
                    description: 'Usa los filtros de fecha para ver reportes de un período específico (semana, mes, etc.).',
                },
                {
                    title: 'Exportar reportes',
                    description: 'En "Gestión Pedidos" también puedes exportar a CSV o PDF todos los pedidos con los filtros que necesites.',
                },
            ],
        },
        {
            id: 'bodega',
            icon: '🏭',
            title: 'Funciones de bodega',
            steps: [
                {
                    title: 'Acceso completo a pedidos',
                    description: 'Como administrador tienes acceso a TODOS los pedidos, de todas las ciudades.',
                },
                {
                    title: 'Todas las transiciones de estado',
                    description: 'Puedes mover los pedidos entre cualquier estado, incluyendo Borrador, Enviado, Revisión, Producción, Despacho y Entregado.',
                },
            ],
        },
    ],
};

// ─── REPARTIDOR ───────────────────────────────────────────────────────────────
const deliveryManual: RoleManual = {
    role: UserRole.DELIVERY,
    description: 'Como Repartidor ves los pedidos asignados a ti, verificas la carga y confirmas las entregas.',
    sections: [
        {
            id: 'por-verificar',
            icon: '📦',
            title: 'Pestaña "Por Verificar"',
            steps: [
                {
                    title: '¿Qué muestra esta pestaña?',
                    description: 'Aquí aparecen los pedidos que bodega ya te asignó pero que aún no han salido a entrega. Son los pedidos que debes verificar que estén físicamente en tu vehículo.',
                },
                {
                    title: 'Verifica la carga',
                    description: 'Revisa en pantalla los productos y cantidades de cada pedido. Confirma físicamente que están en tu vehículo antes de salir.',
                    tip: 'Comunícate con bodega si hay algún faltante o diferencia.',
                },
                {
                    title: 'Espera la confirmación de bodega',
                    description: 'Cuando bodega confirme que la carga está completa y lista, el pedido pasará a la pestaña "En Ruta" automáticamente.',
                },
            ],
        },
        {
            id: 'en-ruta',
            icon: '🚚',
            title: 'Pestaña "En Ruta"',
            steps: [
                {
                    title: '¿Qué muestra esta pestaña?',
                    description: 'Aquí aparecen los pedidos que ya están en despacho oficial — los que ya salieron de bodega y debes entregar.',
                },
                {
                    title: 'Ver la ubicación del destino',
                    description: 'Cada pedido tiene un botón de mapa (📍) que abre Google Maps con la dirección de entrega.',
                },
                {
                    title: 'Confirmar entrega',
                    description: 'Cuando el cliente reciba el pedido, presiona el botón verde "Confirmar Entrega". El pedido pasará a "Entregados".',
                    warning: 'Confirma la entrega solo cuando el cliente haya recibido físicamente el producto.',
                },
            ],
        },
        {
            id: 'historial',
            icon: '✅',
            title: 'Historial de entregas',
            steps: [
                {
                    title: 'Ver entregas completadas',
                    description: 'La pestaña "Entregados" muestra el historial de todos los pedidos que has entregado, con la fecha de entrega.',
                },
            ],
        },
    ],
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const MANUALS: Record<UserRole, RoleManual> = {
    [UserRole.SELLER]: sellerManual,
    [UserRole.WAREHOUSE]: warehouseManual,
    [UserRole.PRODUCTION]: productionManual,
    [UserRole.ADMIN]: adminManual,
    [UserRole.DELIVERY]: deliveryManual,
};
