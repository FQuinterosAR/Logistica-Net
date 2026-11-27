/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NAmdConfig /SuiteScripts/configuration.json
 *
 * Suitelet de despachos: sirve la app de React (GET sin endpoint) y expone los endpoints
 * que la alimentan. Se elige el endpoint con el query param ?endpoint=...
 * Todas las respuestas JSON tienen la forma { ok: true, data } o { ok: false, error }.
 */

define(['N/query', 'N/search', 'N/record', 'N/runtime', 'N/file', 'N/url', 'N/ui/serverWidget',
    '/SuiteScripts/07_recalcularOVLib'],
    (query, search, record, runtime, file, url, serverWidget, recalcularLib) => {

    /** Ruta del build de React (un único index.html) en el File Cabinet. */
    const RUTA_APP = 'SuiteScripts/Suitelet logistica/index.html'

    const TIPO_ORDEN_DESPACHO = 'customtransaction_orden_despacho'
    const TIPO_ARTICULO_DESPACHO = 'customrecord_articulos_despacho'
    const CAMPO_RESPONSABLE = 'custbody_responsable_despacho'

    /**
     * Logs de depuración (log.debug). Para verlos, el deploy tiene que tener "Nivel de log" = Debug.
     * Los errores (log.error) y los pasos importantes (log.audit) se registran siempre.
     */
    const DEBUG = true

    /**
     * Restante de una línea de OV, en unidad base (usa los alias si = salesorderitem, so = salesorder y
     * ut = unitstypeuom de la unidad de la línea).
     * custbody35 = 100: la OV se mueve con traslados internos y lo ya movido está en custcol_preparacion,
     * custcol_listo_despacho y custcol_completado (acumulados por línea, en unidad de venta: se pasan a base).
     * Si no, se mueve con remitos (ejecuciones de pedido) y lo movido es quantityfulfilled.
     * A esto (pasado a unidad de la línea) se le resta además custcolcomprometido_cust: lo que está en órdenes
     * de despacho sin remito. Todas esas columnas las mantiene 07_recalcularOVLib.
     */
    const RESTANTE_BASE = `
        CASE WHEN so.custbody35 = 100
             THEN si.quantity - (NVL(si.custcol_preparacion, 0) + NVL(si.custcol_listo_despacho, 0)
                                 + NVL(si.custcol_completado, 0)) * NVL(ut.conversionrate, 1)
             ELSE si.quantity - NVL(si.quantityfulfilled, 0)
        END`

    /** 'T' si la OV va con traslados internos (custbody35 = 100). */
    const CON_TRASLADO = `CASE WHEN so.custbody35 = 100 THEN 'T' ELSE 'F' END`

    const sqlQuerys = {
        /** OV activas (pendiente de ejecución / parcialmente ejecutada / pendiente de facturación). */
        sqlSO: `
            SELECT
                so.id                               AS ov_id,
                TO_CHAR(so.custbody_prox_fecha_envio, 'YYYY-MM-DD')  AS fecha,
                so.tranid,
                so.entity,
                BUILTIN.DF(so.entity)               AS cliente,
                so.subsidiary,
				BUILTIN.DF(so.subsidiary)			AS subsidiaria,
                so.status,
                BUILTIN.DF(so.status)               AS estado,
                ${CON_TRASLADO}                     AS con_traslado
            FROM salesorder so
            WHERE so.status IN ('B', 'D', 'E')
        `,

        /** OV activas que tienen pendiente el artículo ? (una fila por línea). */
        sqlSoByItem: `
            SELECT DISTINCT
                so.id                               AS ov_id,
                TO_CHAR(so.custbody_prox_fecha_envio, 'YYYY-MM-DD')  AS fecha,
                so.tranid,
                so.entity,
                BUILTIN.DF(so.entity)               AS cliente,
                so.subsidiary,
				BUILTIN.DF(so.subsidiary)				AS subsidiaria,
                so.status,
                BUILTIN.DF(so.status)               AS estado,
                ${CON_TRASLADO}                     AS con_traslado
            FROM salesorderitem si
            INNER JOIN salesorder so ON si.salesorder = so.id
            LEFT JOIN unitstypeuom ut ON ut.internalid = si.units
            WHERE si.item = ?
                AND so.status IN ('B', 'D', 'E')
                AND si.isclosed = 'F'
                AND (${RESTANTE_BASE}) > 0
        `,

        /** Artículos con líneas pendientes en OV activas (opciones del filtro Producto). */
        sqlProductosPendientesRemitos: `
            SELECT DISTINCT
                si.item              AS item,
                BUILTIN.DF(si.item)  AS articulo,
                i.displayname        AS descripcion
            FROM salesorderitem si
            INNER JOIN salesorder so ON so.id = si.salesorder
            INNER JOIN item i ON i.id = si.item
            WHERE so.status IN ('B', 'D', 'E')
              AND si.isclosed = 'F'
        `,

        /** Artículos con restante en líneas abiertas de OV activas (opciones del filtro Producto, ver RESTANTE_BASE). */
        sqlProductosPendientesOVs: `
            SELECT DISTINCT
                si.item              AS item,
                BUILTIN.DF(si.item)  AS articulo,
                i.displayname        AS descripcion
            FROM salesorderitem si
            INNER JOIN salesorder so ON so.id = si.salesorder
            INNER JOIN item i ON i.id = si.item
            LEFT JOIN unitstypeuom ut ON ut.internalid = si.units
            WHERE so.status IN ('B', 'D', 'E')
              AND si.isclosed = 'F'
              AND (${RESTANTE_BASE}) > 0
        `,

        /** Ubicaciones activas. */
        sqlUbicaciones: `
            SELECT id, name
            FROM location
            WHERE isinactive = 'F'
            ORDER BY name
        `,

        /**
         * Líneas con restante de la OV ? (abiertas primero). Cantidades en unidad de venta.
         * disponible = suma de todas las ubicaciones. preparacion / listo_despacho / completado
         * solo tienen sentido en OV con traslado.
         */
        sqlArticulosOV: `
            SELECT
                si.line                                                     AS linea_ov,
                si.custcol_uniqueid                                         AS uniqueid,
                si.item,
                BUILTIN.DF(si.item)                                         AS articulo,
                i.displayname                                               AS descripcion,
                si.isclosed                                                 AS cerrada,
                TO_CHAR(si.expectedshipdate, 'YYYY-MM-DD')                  AS fecha_necesidad_suministro,
                ${CON_TRASLADO}                                             AS con_traslado,
                si.quantity / ut.conversionrate                             AS pedido,
                NVL(si.custcol_preparacion, 0)                              AS preparacion,
                NVL(si.custcol_listo_despacho, 0)                           AS listo_despacho,
                NVL(si.custcol_completado, 0)                               AS completado,
                (${RESTANTE_BASE}) / ut.conversionrate                      AS restante,
                NVL(si.custcolcomprometido_cust, 0)                         AS comprometido,
                NVL(stock.disponible, 0) / ut.conversionrate                AS disponible
            FROM salesorderitem si
            INNER JOIN salesorder so ON so.id = si.salesorder
            INNER JOIN unitstypeuom ut ON si.units = ut.internalid
            INNER JOIN item i ON i.id = si.item
            LEFT JOIN (
                SELECT
                    item,
                    SUM(NVL(quantityavailable, 0)) AS disponible
                FROM InventoryBalance
                GROUP BY item
            ) stock
                ON stock.item = si.item
            WHERE si.salesorder = ?
              AND (${RESTANTE_BASE}) > 0
            ORDER BY si.isclosed, si.line
        `,

        /**
         * Datos del cliente de la OV ? para precargar el despacho: dirección de envío por defecto, teléfono,
         * email y transportistas inicial/final (custentity1/2, id de ShipItem).
         */
        sqlDatosClienteOV: `
            SELECT
                ea.addrtext                         AS direccion,
                cli.phone                           AS telefono,
                cli.email                           AS email,
                cli.custentity1                     AS transporte_inicial,
                cli.custentity2                     AS transporte_final
            FROM salesorder so
            LEFT JOIN customer cli       ON cli.id = so.entity
            LEFT JOIN entityaddress ea   ON ea.nkey = cli.defaultshippingaddress
            WHERE so.id = ?
        `,

        /** Teléfono y email del cliente ? (contacto en el detalle de un despacho). */
        sqlContactoCliente: `
            SELECT phone, email
            FROM customer
            WHERE id = ?
        `,

        /** Transportistas activos (opciones de transporte inicial/final del despacho). */
        sqlTransportistas: `
            SELECT id, displayname
            FROM shipitem
            WHERE isinactive = 'F'
            ORDER BY displayname
        `,

        /** Disponible de cada línea abierta de la OV ? en cada ubicación con stock, en unidad de venta. */
        sqlDisponiblePorUbicacion: `
            SELECT
                si.line                                  AS linea_ov,
                si.item,
                stock.location                           AS ubicacion_id,
                stock.disponible / ut.conversionrate     AS disponible
            FROM salesorderitem si
            INNER JOIN unitstypeuom ut ON si.units = ut.internalid
            INNER JOIN (
                SELECT
                    item,
                    location,
                    SUM(NVL(quantityavailable, 0)) AS disponible
                FROM InventoryBalance
                GROUP BY item, location
            ) stock
                ON stock.item = si.item
            WHERE si.salesorder = ?
              AND si.isclosed = 'F'
        `,

        /**
         * Órdenes de despacho con su remito (ejecución de pedido o traslado de inventario).
         * estado_remito_id: 0 sin remito, 1 preparación, 2 listo para despacho, 3 despachado.
         * cliente: "número nombre" (entityid + altname), igual que BUILTIN.DF(entity) en las OV.
         * Termina en WHERE para poder agregar condiciones con AND (ver getDetalleDespacho).
         */
        sqlDespachos: `
            SELECT
                od.id                                        AS despacho_id,
                od.tranid                                    AS numero,
                TO_CHAR(od.trandate, 'YYYY-MM-DD')           AS fecha,
                od.custbody_cliente                          AS cliente_id,
                cli.entityid || ' ' || cli.altname           AS cliente,
                od.custbody_ubicacion_despacho               AS ubicacion_id,
                BUILTIN.DF(od.custbody_ubicacion_despacho)   AS ubicacion,
                od.subsidiary                                AS subsidiaria_id,
                BUILTIN.DF(od.subsidiary)                    AS subsidiaria,
                od.custbody_ov_despacho                      AS ov_id,
                BUILTIN.DF(od.custbody_ov_despacho)          AS ov_numero,
                ov.tranid                                    AS ov_tranid,
                od.custbody_responsable_despacho             AS responsable_id,
                BUILTIN.DF(od.custbody_responsable_despacho) AS responsable,
                od.memo                                      AS nota,
                od.custbody_trans_inicial_despacho           AS transporte_inicial,
                od.custbody_trasn_final_despacho             AS transporte_final,
                od.custbody_valor_declarado_transporte       AS valor_declarado,
                od.custbody_direccion_despacho               AS direccion,
                rem.id                                       AS remito_id,
                rem.tranid                                   AS remito_numero,
                rem.type                                     AS remito_tipo,
                TO_CHAR(rem.trandate, 'YYYY-MM-DD')          AS remito_fecha,
                CASE
                    WHEN rem.id IS NULL         THEN 0
                    WHEN rem.type = 'ItemShip'  THEN CASE ifu.shipstatus WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 END
                    WHEN rem.type = 'InvTrnfr'  THEN rem.custbodyestado_remito
                END                                          AS estado_remito_id
            FROM transaction od
            INNER JOIN customtransactiontype ctt ON ctt.id = od.customtype
            LEFT JOIN transaction rem     ON rem.id = od.custbodyremito_despacho
            LEFT JOIN itemfulfillment ifu ON ifu.id = rem.id
            LEFT JOIN transaction ov      ON ov.id = od.custbody_ov_despacho
            LEFT JOIN customer cli        ON cli.id = od.custbody_cliente
            WHERE ctt.scriptid = 'customtransaction_orden_despacho'
        `,

        /**
         * Artículos del despacho ? (una fila por línea de la OV, unidas por custcol_uniqueid): lo despachado y el
         * total de la línea, en unidad de venta. El restante y el disponible para editar los pide el front aparte
         * (getArticulosOrden y getDisponibleUbicaciones) al momento de editar.
         */
        sqlArticulosDespacho: `
            SELECT
                ad.id                                           AS linea_id,
                ad.custrecord_uniqueid                          AS uniqueid,
                ad.custrecord_articulo_despacho                 AS item,
                BUILTIN.DF(ad.custrecord_articulo_despacho)     AS articulo,
                i.displayname                                   AS descripcion,
                ad.custrecord_cantidad_despacho                 AS cantidad,
                ad.custrecord_detalle_inventario                AS detalle_inventario,
                si.line                                         AS linea_ov,
                si.quantity / ut.conversionrate                 AS total
            FROM customrecord_articulos_despacho ad
            INNER JOIN transaction od ON od.id = ad.custrecord_link_orden
            LEFT JOIN item i ON i.id = ad.custrecord_articulo_despacho
            LEFT JOIN salesorderitem si
                   ON si.salesorder = od.custbody_ov_despacho
                  AND si.custcol_uniqueid = ad.custrecord_uniqueid
            LEFT JOIN unitstypeuom ut ON ut.internalid = si.units
            WHERE ad.custrecord_link_orden = ?
              AND ad.isinactive = 'F'
        `,

        /** Filas de artículos activas de un despacho (cantidades anteriores al editar). */
        sqlArticulosDespachoIds: `
            SELECT
                id,
                custrecord_articulo_despacho  AS item,
                custrecord_uniqueid           AS uniqueid,
                custrecord_cantidad_despacho  AS cantidad
            FROM customrecord_articulos_despacho
            WHERE custrecord_link_orden = ?
              AND isinactive = 'F'
        `,

        sqlTranid: `SELECT tranid FROM transaction WHERE id = ?`,
    }

    const onRequest = (context) => {
        const { request, response } = context
        const params = request.parameters
        const { endpoint } = params
        const nombre = `${request.method} ${endpoint || '(app)'}`
        const inicio = Date.now()

        logDebug(`→ ${nombre}`, { params, usuario: usuarioActual() })

        try {
            if (request.method === 'GET') {
                if (!endpoint) return servirContenedor(response)
                if (endpoint === 'app') return servirApp(response)
                if (endpoint === 'getOpciones') return responder(response, getOpciones())
                if (endpoint === 'getOrdenes') return responder(response, getOrdenes(params))
                if (endpoint === 'getArticulosOrden') return responder(response, getArticulosOrden(params))
                if (endpoint === 'getDisponibleUbicaciones') return responder(response, getDisponibleUbicaciones(params))
                if (endpoint === 'getDespachos') return responder(response, getDespachos())
                if (endpoint === 'getDetalleDespacho') return responder(response, getDetalleDespacho(params))
                return responderError(response, `Endpoint GET desconocido: ${endpoint}`)
            }

            if (request.method === 'POST') {
                const body = leerBody(request)
                logDebug(`${nombre} body`, body)
                if (endpoint === 'postGenerarOrden') return responder(response, postGenerarOrden(body))
                if (endpoint === 'postGuardarDespacho') return responder(response, postGuardarDespacho(body))
                return responderError(response, `Endpoint POST desconocido: ${endpoint}`)
            }

            return responderError(response, `Método no soportado: ${request.method}`)
        } catch (e) {
            log.error({ title: `✗ ${nombre} (${Date.now() - inicio} ms)`, details: detalleError(e) })
            return responderError(response, e.message || String(e))
        } finally {
            logDebug(`← ${nombre}`, {
                ms: Date.now() - inicio,
                gobernanzaRestante: runtime.getCurrentScript().getRemainingUsage(),
            })
        }
    }

    // ───────────────────────── Endpoints GET ─────────────────────────

    /** Opciones fijas de los formularios: productos con OV pendientes y ubicaciones. */
    function getOpciones() {
        const productos = ejecutar(sqlQuerys.sqlProductosPendientesOVs)
            .map((p) => ({ value: String(p.item), label: nombreArticulo(p.articulo, p.descripcion) }))
            .sort((a, b) => a.label.localeCompare(b.label))
        const ubicaciones = ejecutar(sqlQuerys.sqlUbicaciones)
            .map((u) => ({ value: String(u.id), label: u.name }))
        logDebug('getOpciones', { productos: productos.length, ubicaciones: ubicaciones.length })
        return { productos, ubicaciones }
    }

    /**
     * OV activas agrupadas por cliente, más el usuario actual (para el responsable del despacho).
     * Con ?producto=<id de artículo> trae solo las OV que tienen ese artículo pendiente.
     * Los filtros de cliente y fecha se aplican en el frontend.
     */
    function getOrdenes({ producto }) {
        const filas = producto
            ? ejecutar(sqlQuerys.sqlSoByItem, [requerirId(producto, 'producto')])
            : ejecutar(sqlQuerys.sqlSO)
        const clientes = obtenerClientes(filas)
        logDebug('getOrdenes', {
            producto: producto || null,
            filas: filas.length,
            clientes: Object.keys(clientes).length,
            ovs: Object.values(clientes).reduce((n, c) => n + c.ovs.length, 0),
        })
        return { usuario: usuarioActual(), clientes }
    }

    /**
     * Artículos con restante de una OV (?ovId=), una fila por línea (abiertas primero). En unidad de venta.
     * `restante` ya descuenta lo que está en órdenes de despacho sin remito (custcolcomprometido_cust de la línea).
     * `disponible` es la suma de todas las ubicaciones (el de cada ubicación lo da getDisponibleUbicaciones).
     * `cliente`: dirección y transportes (id de ShipItem) del cliente de la OV, para precargar el modal "Generar orden".
     * `transportistas`: opciones de transporte inicial/final ([{ value, label }]).
     */
    function getArticulosOrden({ ovId }) {
        const id = requerirId(ovId, 'ovId')
        const lineas = ejecutar(sqlQuerys.sqlArticulosOV, [id])
        const [datosCliente = {}] = ejecutar(sqlQuerys.sqlDatosClienteOV, [id])
        logDebug(`getArticulosOrden ov ${id}`, { lineas: lineas.length })

        const cliente = {
            direccion: datosCliente.direccion,
            telefono: datosCliente.telefono,
            email: datosCliente.email,
            transporteInicial: datosCliente.transporte_inicial,
            transporteFinal: datosCliente.transporte_final,
        }
        const articulos = lineas.map((l) => {
            const cerrada = l.cerrada === 'T'
            const restanteOV = cantidad(l.restante)
            const comprometido = cerrada ? 0 : Math.min(restanteOV, cantidad(l.comprometido))
            return {
                id: l.linea_ov,
                lineaOv: l.linea_ov,
                uniqueId: l.uniqueid,
                item: l.item,
                nombre: nombreArticulo(l.articulo, l.descripcion),
                cerrada,
                fechaNecesidadSuministro: l.fecha_necesidad_suministro,
                conTraslado: l.con_traslado === 'T',
                pedido: cantidad(l.pedido),
                preparacion: cantidad(l.preparacion),
                listoDespacho: cantidad(l.listo_despacho),
                completado: cantidad(l.completado),
                restanteOV,
                enDespacho: comprometido,
                restante: cantidad(restanteOV - comprometido),
                disponible: cantidad(l.disponible),
            }
        })
        return { articulos, cliente, transportistas: obtenerTransportistas() }
    }

    /**
     * Disponible de las líneas abiertas de la OV (?ovId=) en cada ubicación, en unidad de venta:
     * { [ubicacionId]: { [lineaOv]: disponible } }. Las ubicaciones sin stock no vienen.
     */
    function getDisponibleUbicaciones({ ovId }) {
        const id = requerirId(ovId, 'ovId')
        const porUbicacion = {}
        ejecutar(sqlQuerys.sqlDisponiblePorUbicacion, [id]).forEach((f) => {
            if (!porUbicacion[f.ubicacion_id]) porUbicacion[f.ubicacion_id] = {}
            porUbicacion[f.ubicacion_id][f.linea_ov] = cantidad(f.disponible)
        })
        logDebug(`getDisponibleUbicaciones ov ${id}`, { ubicaciones: Object.keys(porUbicacion).length })
        return porUbicacion
    }

    /** Lista de órdenes de despacho + opciones de los filtros (solo valores que tienen despachos). */
    function getDespachos() {
        const filas = ejecutar(sqlQuerys.sqlDespachos)
        logDebug('getDespachos', { despachos: filas.length })
        return {
            despachos: filas.map(mapearDespacho),
            opciones: {
                clientes: obtenerOpciones(filas, 'cliente_id', 'cliente'),
                usuarios: obtenerOpciones(filas, 'responsable_id', 'responsable'),
                ubicaciones: obtenerOpciones(filas, 'ubicacion_id', 'ubicacion'),
                subsidiarias: obtenerOpciones(filas, 'subsidiaria_id', 'subsidiaria'),
                ordenesVenta: obtenerOpciones(filas, 'ov_id', 'ov_tranid').map((o) => ({ ...o, label: `#${o.label}` })),
            },
        }
    }

    /**
     * Un despacho (?id=) con sus artículos: total de la línea de la OV y cantidad despachada en esta orden.
     * El restante y el disponible para editar los calcula el front al momento de editar.
     */
    function getDetalleDespacho({ id }) {
        const despachoId = requerirId(id, 'id')
        const [fila] = ejecutar(`${sqlQuerys.sqlDespachos} AND od.id = ?`, [despachoId])
        if (!fila) throw new Error(`No existe la orden de despacho ${despachoId}`)

        const articulos = ejecutar(sqlQuerys.sqlArticulosDespacho, [despachoId]).map((a) => ({
            id: a.linea_id,
            uniqueId: a.uniqueid,
            item: a.item,
            nombre: nombreArticulo(a.articulo, a.descripcion),
            cantidad: cantidad(a.cantidad),
            detalleInventario: a.detalle_inventario,
            lineaOv: a.linea_ov,
            total: cantidad(a.total),
        }))
        logDebug(`getDetalleDespacho ${despachoId}`, { remito: fila.remito_id, articulos: articulos.length })

        const [cli = {}] = fila.cliente_id ? ejecutar(sqlQuerys.sqlContactoCliente, [fila.cliente_id]) : []
        return {
            ...mapearDespacho(fila),
            articulos,
            transportistas: obtenerTransportistas(),
            contacto: { telefono: cli.phone, email: cli.email },
        }
    }

    // ───────────────────────── Endpoints POST ─────────────────────────

    /**
     * Crea una orden de despacho desde una OV y una fila de customrecord_articulos_despacho por línea de la OV,
     * y suma lo despachado al custcolcomprometido_cust de cada línea de la OV.
     * Body: { ovId, fecha (YYYY-MM-DD), ubicacion, nota, transporteInicial, transporteFinal (id de ShipItem),
     *         valorDeclarado, direccion, articulos: [{ uniqueId, item, lineaOv, cantidad }] }
     * El responsable es siempre el usuario actual (no se toma del body).
     */
    function postGenerarOrden(body) {
        const ovId = requerirId(body.ovId, 'ovId')
        const ubicacion = requerirId(body.ubicacion, 'ubicacion')
        const fecha = parsearFecha(body.fecha)
        const limites = limitesDespacho(ovId, {}, ubicacion)
        logDebug(`postGenerarOrden ov ${ovId}: límites (ubicación ${ubicacion})`, limites)
        const cantidades = validarArticulos(body.articulos, limites)
        logDebug(`postGenerarOrden ov ${ovId}: cantidades validadas por línea`, cantidades)

        const ov = search.lookupFields({ type: search.Type.SALES_ORDER, id: ovId, columns: ['entity', 'subsidiary'] })
        logDebug(`postGenerarOrden ov ${ovId}: datos de la OV`, ov)

        // Modo estándar (más rápido que dinámico); el sourcing de los campos dependientes se hace al guardar.
        const od = record.create({ type: TIPO_ORDEN_DESPACHO, isDynamic: false })
        logDebug('postGenerarOrden: campos disponibles en la orden de despacho', od.getFields())
        // La orden de despacho (transacción solo cabecera) no tiene entity ni location nativos: usa campos custom.
        paso('custbody_cliente', () => od.setValue({ fieldId: 'custbody_cliente', value: valorLista(ov.entity) }))
        paso('subsidiary', () => setSiExiste(od, 'subsidiary', valorLista(ov.subsidiary)))
        paso('custbody_subsidiaria', () => od.setValue({ fieldId: 'custbody_subsidiaria', value: valorLista(ov.subsidiary) }))
        paso('fecha', () => setFecha(od, fecha))
        paso('custbody_ubicacion_despacho', () => od.setValue({ fieldId: 'custbody_ubicacion_despacho', value: ubicacion }))
        paso('custbody_ov_despacho', () => od.setValue({ fieldId: 'custbody_ov_despacho', value: ovId }))
        paso(CAMPO_RESPONSABLE, () => setResponsable(od, runtime.getCurrentUser()))
        paso('cabecera (memo y transportes)', () => setCabecera(od, body))

        const despachoId = paso('guardar orden de despacho', () =>
            od.save({ enableSourcing: true, ignoreMandatoryFields: false }))
        log.audit({ title: `Orden de despacho ${despachoId} creada`, details: { ovId, cantidades } })

        let articulosCreados = []
        try {
            articulosCreados = crearArticulos(despachoId, cantidades)
            actualizarComprometido(ovId, {}, soloCantidades(cantidades))
        } catch (e) {
            // Sin artículos o sin el comprometido de la OV la orden no sirve: se borra para no dejarla a medias.
            log.error({ title: `Error completando el despacho ${despachoId}; se elimina`, details: detalleError(e) })
            articulosCreados.forEach((artId) => record.delete({ type: TIPO_ARTICULO_DESPACHO, id: artId }))
            record.delete({ type: TIPO_ORDEN_DESPACHO, id: despachoId })
            log.audit({ title: `Orden de despacho ${despachoId} eliminada por el error anterior`, details: '' })
            throw e
        }

        const [fila] = ejecutar(sqlQuerys.sqlTranid, [despachoId])
        return { id: despachoId, tranid: fila ? fila.tranid : String(despachoId) }
    }

    /**
     * Edita una orden de despacho sin remito: cabecera y artículos. El responsable y la OV no cambian.
     * Body: { despachoId, fecha, ubicacion, nota, transporte..., articulos: [{ uniqueId, item, lineaOv, cantidad }] }
     * Las líneas que no vienen (o vienen en 0) se eliminan del despacho.
     * En la OV, a custcolcomprometido_cust de cada línea se le resta la cantidad anterior y se le suma la nueva.
     */
    function postGuardarDespacho(body) {
        const despachoId = requerirId(body.despachoId, 'despachoId')
        const od = paso(`cargar despacho ${despachoId}`, () => record.load({ type: TIPO_ORDEN_DESPACHO, id: despachoId }))

        const remito = od.getValue({ fieldId: 'custbodyremito_despacho' })
        if (remito) {
            throw new Error(`El despacho ya tiene remito vinculado (${remito}); no se puede editar`)
        }

        const ovId = requerirId(od.getValue({ fieldId: 'custbody_ov_despacho' }), 'OV del despacho')
        const ubicacion = requerirId(body.ubicacion || od.getValue({ fieldId: 'custbody_ubicacion_despacho' }), 'ubicacion')

        // Cantidades actuales del despacho por línea: están dentro del comprometido de la OV.
        const filasAnteriores = ejecutar(sqlQuerys.sqlArticulosDespachoIds, [despachoId])
        const anteriores = {}
        filasAnteriores.forEach((f) => {
            if (f.uniqueid != null) anteriores[f.uniqueid] = (anteriores[f.uniqueid] || 0) + cantidad(f.cantidad)
        })

        const limites = limitesDespacho(ovId, anteriores, ubicacion)
        logDebug(`postGuardarDespacho ${despachoId}: límites (ov ${ovId}, ubicación ${ubicacion})`, limites)
        const cantidades = validarArticulos(body.articulos, limites)
        const nuevas = soloCantidades(cantidades)
        logDebug(`postGuardarDespacho ${despachoId}: cantidades por línea`, { anteriores, nuevas })

        // Primero la OV: si falla, no se tocó nada del despacho.
        actualizarComprometido(ovId, anteriores, nuevas)
        try {
            if (body.fecha) paso('fecha', () => setFecha(od, parsearFecha(body.fecha)))
            paso('custbody_ubicacion_despacho', () => od.setValue({ fieldId: 'custbody_ubicacion_despacho', value: ubicacion }))
            paso('cabecera (memo y transportes)', () => setCabecera(od, body))
            paso(`guardar despacho ${despachoId}`, () => od.save({ enableSourcing: true, ignoreMandatoryFields: false }))
            sincronizarArticulos(despachoId, cantidades, filasAnteriores)
        } catch (e) {
            log.error({ title: `Error guardando el despacho ${despachoId}; se revierte el comprometido de la OV ${ovId}`, details: detalleError(e) })
            try {
                actualizarComprometido(ovId, nuevas, anteriores)
            } catch (e2) {
                log.error({ title: `No se pudo revertir el comprometido de la OV ${ovId}; revisar a mano`, details: { anteriores, nuevas, error: detalleError(e2) } })
            }
            throw e
        }

        log.audit({ title: `Orden de despacho ${despachoId} actualizada`, details: { ovId, anteriores, nuevas } })
        return { id: despachoId }
    }

    // ───────────────────────── Lógica de despacho ─────────────────────────

    /**
     * Límites para despachar de la OV en la ubicación dada (unidad de la línea):
     *  - lineas: { [uniqueid]: { item, lineaOv, nombre, limite } } → restante de la línea abierta
     *    − custcolcomprometido_cust + `propias` (al editar, la cantidad actual del despacho, que ya está dentro
     *    del comprometido).
     *  - items: { [item]: { nombre, disponible } } → disponible en la ubicación (el stock es por artículo, así
     *    que lo comparten todas las líneas del mismo artículo).
     */
    function limitesDespacho(ovId, propias, ubicacionId) {
        const lineas = {}
        const items = {}
        ejecutar(sqlQuerys.sqlArticulosOV, [ovId]).forEach((l) => {
            if (l.cerrada === 'T' || l.uniqueid == null) return
            const nombre = nombreArticulo(l.articulo, l.descripcion)
            const libre = cantidad(l.restante) - cantidad(l.comprometido) + (propias[l.uniqueid] || 0)
            lineas[l.uniqueid] = {
                item: l.item,
                lineaOv: l.linea_ov,
                nombre,
                limite: cantidad(Math.max(0, libre)),
            }
            if (!items[l.item]) items[l.item] = { nombre, disponible: 0 }
        })

        ejecutar(sqlQuerys.sqlDisponiblePorUbicacion, [ovId]).forEach((f) => {
            if (items[f.item] && Number(f.ubicacion_id) === Number(ubicacionId)) {
                items[f.item].disponible = cantidad(f.disponible)
            }
        })
        return { lineas, items }
    }

    /**
     * Valida las cantidades pedidas por línea (contra el restante de cada línea) y por artículo (la suma de sus
     * líneas contra el disponible en la ubicación). Devuelve { [uniqueid]: { item, cantidad } }.
     */
    function validarArticulos(articulos, limites) {
        if (!Array.isArray(articulos) || !articulos.length) {
            throw new Error('No hay artículos con cantidad para despachar')
        }

        const porLinea = {}
        articulos.forEach((a) => {
            const uniqueId = requerirId(a.uniqueId, 'uniqueId')
            const cantidad = Number(a.cantidad)
            const linea = limites.lineas[uniqueId]
            if (!linea) throw new Error(`La línea ${a.lineaOv || uniqueId} no tiene cantidad pendiente en la OV`)
            if (!Number.isInteger(cantidad) || cantidad <= 0) {
                throw new Error(`Cantidad inválida para ${linea.nombre} (línea ${linea.lineaOv}): ${a.cantidad}`)
            }
            if (!porLinea[uniqueId]) porLinea[uniqueId] = { item: linea.item, cantidad: 0 }
            porLinea[uniqueId].cantidad += cantidad
        })

        const porItem = {}
        Object.keys(porLinea).forEach((uniqueId) => {
            const linea = limites.lineas[uniqueId]
            const pedido = porLinea[uniqueId].cantidad
            if (pedido > linea.limite) {
                throw new Error(`${linea.nombre} (línea ${linea.lineaOv}): se pueden despachar como máximo ${linea.limite} (se pidieron ${pedido})`)
            }
            porItem[linea.item] = (porItem[linea.item] || 0) + pedido
        })

        Object.keys(porItem).forEach((item) => {
            const { nombre, disponible } = limites.items[item]
            if (porItem[item] > disponible) {
                throw new Error(`${nombre}: hay ${disponible} disponibles en la ubicación (se pidieron ${porItem[item]})`)
            }
        })
        return porLinea
    }

    /**
     * Crea una fila de artículos por cada línea de la OV y devuelve sus ids.
     * Si una falla, borra las creadas y relanza el error.
     */
    function crearArticulos(despachoId, lineas) {
        const creados = []
        try {
            Object.keys(lineas).forEach((uniqueId) => {
                creados.push(crearArticulo(despachoId, uniqueId, lineas[uniqueId]))
            })
        } catch (e) {
            log.error({ title: `Falló crear artículos del despacho ${despachoId}; se borran ${creados.length} creados`, details: detalleError(e) })
            creados.forEach((id) => record.delete({ type: TIPO_ARTICULO_DESPACHO, id }))
            throw e
        }
        logDebug(`Artículos creados para el despacho ${despachoId}`, creados)
        return creados
    }

    /** { [uniqueid]: cantidad } a partir de las líneas validadas ({ [uniqueid]: { item, cantidad } }). */
    function soloCantidades(lineas) {
        const cantidades = {}
        Object.keys(lineas).forEach((uniqueId) => { cantidades[uniqueId] = lineas[uniqueId].cantidad })
        return cantidades
    }

    /** Resta `anteriores` y suma `nuevas` ({ [uniqueid]: cantidad }) al comprometido de la OV (07_recalcularOVLib). */
    function actualizarComprometido(ovId, anteriores, nuevas) {
        paso(`actualizar el comprometido de la OV ${ovId}`, () => recalcularLib.actualizarComprometido(ovId, anteriores, nuevas))
    }

    /** Fila de customrecord_articulos_despacho para una línea de la OV (custrecord_uniqueid = custcol_uniqueid). */
    function crearArticulo(despachoId, uniqueId, { item, cantidad }) {
        const rec = record.create({ type: TIPO_ARTICULO_DESPACHO })
        rec.setValue({ fieldId: 'custrecord_link_orden', value: despachoId })
        rec.setValue({ fieldId: 'custrecord_articulo_despacho', value: Number(item) })
        rec.setValue({ fieldId: 'custrecord_cantidad_despacho', value: cantidad })
        rec.setValue({ fieldId: 'custrecord_uniqueid', value: Number(uniqueId) })
        setSiExiste(rec, 'name', `Despacho ${despachoId} - línea ${uniqueId} - artículo ${item}`)
        return paso(`guardar línea ${uniqueId} (artículo ${item}, cantidad ${cantidad}) del despacho ${despachoId}`, () => rec.save())
    }

    /**
     * Deja las filas de artículos del despacho iguales a `lineas` ({ [uniqueid]: { item, cantidad } }):
     * actualiza, crea o borra. `filas`: las filas actuales (sqlArticulosDespachoIds).
     */
    function sincronizarArticulos(despachoId, lineas, filas) {
        const pendientes = { ...lineas }
        filas.forEach((fila) => {
            const linea = fila.uniqueid != null ? pendientes[fila.uniqueid] : null
            logDebug(`sincronizarArticulos ${despachoId}: fila ${fila.id}`, {
                uniqueid: fila.uniqueid,
                item: fila.item,
                accion: linea ? `actualizar a ${linea.cantidad}` : 'borrar',
            })
            if (linea) {
                record.submitFields({
                    type: TIPO_ARTICULO_DESPACHO,
                    id: fila.id,
                    values: { custrecord_cantidad_despacho: linea.cantidad },
                })
                delete pendientes[fila.uniqueid]
            } else {
                record.delete({ type: TIPO_ARTICULO_DESPACHO, id: fila.id })
            }
        })
        Object.keys(pendientes).forEach((uniqueId) => crearArticulo(despachoId, uniqueId, pendientes[uniqueId]))
    }

    /** Fecha del despacho: trandate (nativo) y custbody_fecha_despacho. */
    function setFecha(rec, fecha) {
        rec.setValue({ fieldId: 'trandate', value: fecha })
        rec.setValue({ fieldId: 'custbody_fecha_despacho', value: fecha })
    }

    /**
     * Nota (memo y custbodynota_despacho), dirección, transportes (listas de ShipItem: id) y valor declarado que vienen
     * del formulario.
     */
    function setCabecera(rec, body) {
        rec.setValue({ fieldId: 'memo', value: texto(body.nota) })
        rec.setValue({ fieldId: 'custbodynota_despacho', value: texto(body.nota) })
        rec.setValue({ fieldId: 'custbody_direccion_despacho', value: texto(body.direccion) })
        rec.setValue({ fieldId: 'custbody_trans_inicial_despacho', value: idOpcional(body.transporteInicial, 'transporteInicial') })
        rec.setValue({ fieldId: 'custbody_trasn_final_despacho', value: idOpcional(body.transporteFinal, 'transporteFinal') })
        rec.setValue({ fieldId: 'custbody_valor_declarado_transporte', value: valorDeclarado(body.valorDeclarado) })
    }

    /** Id de un campo de lista opcional: vacío → '' (limpia el campo). */
    function idOpcional(valor, nombre) {
        if (valor === '' || valor == null) return ''
        return requerirId(valor, nombre)
    }

    /** Valor declarado: vacío → '' (limpia el campo); si viene, número ≥ 0. */
    function valorDeclarado(valor) {
        if (valor === '' || valor == null) return ''
        const n = Number(valor)
        if (!Number.isFinite(n) || n < 0) throw new Error(`Valor declarado inválido: ${valor}`)
        return n
    }

    /** Responsable = usuario actual. Si el campo es lista (empleado) guarda el id; si es texto, el nombre. */
    function setResponsable(rec, usuario) {
        const campo = rec.getField({ fieldId: CAMPO_RESPONSABLE })
        if (!campo) {
            log.audit({ title: `Campo ${CAMPO_RESPONSABLE} no existe en la orden de despacho; se omite`, details: '' })
            return
        }
        logDebug('setResponsable', { tipoCampo: campo.type, id: usuario.id, nombre: usuario.name })
        rec.setValue({ fieldId: CAMPO_RESPONSABLE, value: campo.type === 'select' ? usuario.id : usuario.name })
    }

    // ───────────────────────── Métodos auxiliares ─────────────────────────

    /**
     * GET sin endpoint: página de NetSuite (con menú y título) que muestra la app en un iframe.
     * El iframe apunta a este mismo Suitelet con ?endpoint=app y ocupa el resto de la pantalla
     * (alto fijo con scroll propio, así el modal queda centrado en lo visible).
     */
    function servirContenedor(response) {
        const script = runtime.getCurrentScript()
        const src = url.resolveScript({
            scriptId: script.id,
            deploymentId: script.deploymentId,
            params: { endpoint: 'app' },
        })
        const form = serverWidget.createForm({ title: 'Despachos' })
        const campo = form.addField({ id: 'custpage_app', type: serverWidget.FieldType.INLINEHTML, label: 'App' })
        campo.updateLayoutType({ layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW })
        campo.defaultValue = `
            <iframe id="despachos-app" src="${src}" title="Despachos"
                    style="display:block;border:0;min-width:600px;min-height:500px"></iframe>
            <script>
              (function () {
                var f = document.getElementById('despachos-app');
                var doc = document.documentElement;
                // NetSuite mete el campo en una columna angosta: ancho y alto en px hasta el borde de la ventana.
                // Después se descuenta lo que la página de NetSuite haya quedado con scroll (márgenes, pie),
                // para que el único scroll sea el de la app.
                function ajustar() {
                  var r = f.getBoundingClientRect();
                  var izquierda = r.left + window.pageXOffset;
                  var arriba = r.top + window.pageYOffset;

                  var ancho = Math.max(600, doc.clientWidth - izquierda - 8);
                  f.style.width = ancho + 'px';
                  var sobraAncho = doc.scrollWidth - doc.clientWidth;
                  if (sobraAncho > 0) f.style.width = Math.max(600, ancho - sobraAncho) + 'px';

                  var alto = Math.max(500, doc.clientHeight - arriba - 4);
                  f.style.height = alto + 'px';
                  var sobraAlto = doc.scrollHeight - doc.clientHeight;
                  if (sobraAlto > 0) f.style.height = Math.max(500, alto - sobraAlto) + 'px';
                }
                window.addEventListener('resize', ajustar);
                window.addEventListener('load', ajustar);
                ajustar();
              })();
            </script>`
        logDebug('servirContenedor', { src })
        response.writePage(form)
    }

    /** GET ?endpoint=app: devuelve el build de React guardado en el File Cabinet (se carga dentro del iframe). */
    function servirApp(response) {
        response.setHeader({ name: 'Content-Type', value: 'text/html; charset=utf-8' })
        try {
            const html = file.load({ id: RUTA_APP }).getContents()
            logDebug('servirApp', `${RUTA_APP} cargado (${html.length} caracteres)`)
            response.write(html)
        } catch (e) {
            log.error({ title: `No se pudo cargar ${RUTA_APP}`, details: detalleError(e) })
            response.write(`<p>No se encontró la app en <b>${RUTA_APP}</b>. Subí el index.html del build a esa ruta.</p>`)
        }
    }

    /** Ejecuta SuiteQL paginado (sin el límite de 5000 filas de runSuiteQL) y devuelve objetos por alias. */
    function ejecutar(sql, params = []) {
        const nombre = Object.keys(sqlQuerys).find((k) => sqlQuerys[k] === sql) || 'consulta armada (sqlDespachos + filtro)'
        const inicio = Date.now()
        try {
            const paginado = query.runSuiteQLPaged({ query: sql, params, pageSize: 1000 })
            const filas = []
            paginado.pageRanges.forEach((rango) => {
                paginado.fetch({ index: rango.index }).data.asMappedResults().forEach((f) => filas.push(f))
            })
            logDebug(`SQL ${nombre}`, { params, filas: filas.length, ms: Date.now() - inicio, primeraFila: filas[0] || null })
            return filas
        } catch (e) {
            log.error({ title: `SQL ${nombre} falló`, details: `${detalleError(e)}\nparams: ${JSON.stringify(params)}\n${sql}` })
            throw e
        }
    }

    /** Ejecuta un paso de armado/guardado de registro; si falla, deja en el log cuál fue. */
    function paso(descripcion, fn) {
        try {
            const resultado = fn()
            logDebug(`OK ${descripcion}`, resultado == null ? '' : resultado)
            return resultado
        } catch (e) {
            log.error({ title: `Falló: ${descripcion}`, details: detalleError(e) })
            throw e
        }
    }

    /** log.debug solo si DEBUG; serializa objetos y corta a 3900 caracteres (límite de NetSuite: 3999). */
    function logDebug(title, details) {
        if (!DEBUG) return
        let texto = details
        if (typeof details !== 'string') {
            try { texto = JSON.stringify(details) } catch (e) { texto = String(details) }
        }
        log.debug({ title: String(title).slice(0, 99), details: (texto || '').slice(0, 3900) })
    }

    /** Nombre, mensaje y stack de un error (los SuiteScriptError traen name tipo INVALID_FLD_VALUE). */
    function detalleError(e) {
        if (!e) return 'Error vacío'
        const stack = Array.isArray(e.stack) ? e.stack.join('\n') : e.stack
        return `${e.name || 'Error'}: ${e.message || String(e)}${stack ? `\n${stack}` : ''}`.slice(0, 3900)
    }

    function responder(response, data) {
        escribirJson(response, { ok: true, data })
    }

    function responderError(response, error) {
        escribirJson(response, { ok: false, error })
    }

    function escribirJson(response, payload) {
        response.setHeader({ name: 'Content-Type', value: 'application/json; charset=utf-8' })
        response.write(JSON.stringify(payload))
    }

    function leerBody(request) {
        if (!request.body) return {}
        try {
            return JSON.parse(request.body)
        } catch (e) {
            throw new Error('El body no es un JSON válido')
        }
    }

    /** Convierte un parámetro a id numérico o tira un error claro. */
    function requerirId(valor, nombre) {
        const n = Number(valor)
        if (!Number.isInteger(n) || n <= 0) throw new Error(`Parámetro "${nombre}" inválido: ${valor}`)
        return n
    }

    /** 'YYYY-MM-DD' → Date (hora local), o error claro. */
    function parsearFecha(valor) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor || '')
        if (!m) throw new Error(`Fecha inválida: ${valor}`)
        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    }

    /** Setea un campo solo si existe en el registro (campos nativos que dependen de la configuración). */
    function setSiExiste(rec, fieldId, value) {
        if (value == null || value === '') return
        if (rec.getFields().indexOf(fieldId) === -1) {
            log.audit({ title: `Campo ${fieldId} no existe en ${rec.type}; se omite`, details: value })
            return
        }
        rec.setValue({ fieldId, value })
    }

    /** lookupFields devuelve los campos de lista como [{ value, text }]. */
    function valorLista(valor) {
        if (Array.isArray(valor)) return valor.length ? valor[0].value : null
        return valor
    }

    function texto(valor) {
        return valor == null ? '' : String(valor)
    }

    /** Cantidad numérica redondeada a 6 decimales (las divisiones por conversionrate pueden dejar restos). */
    function cantidad(valor) {
        return Math.round((Number(valor) || 0) * 1e6) / 1e6
    }

    /** "04.03.04.0004 - MINI CUCURUCHON..." */
    function nombreArticulo(codigo, descripcion) {
        return descripcion ? `${codigo} - ${descripcion}` : codigo
    }

    function usuarioActual() {
        const usuario = runtime.getCurrentUser()
        return { id: usuario.id, nombre: usuario.name }
    }

    /**
     * Agrupa las OV por cliente, sin repetir OV (sqlSoByItem devuelve una fila por línea):
     * { [entity]: { id, nombre, ovs: [{ id, numero, fecha, estado }] } }
     */
    function obtenerClientes(filas) {
        const clientes = {}
        filas.forEach((f) => {
            if (!clientes[f.entity]) {
                clientes[f.entity] = { id: f.entity, nombre: f.cliente, ovs: {} }
            }
            const ovs = clientes[f.entity].ovs
            if (!ovs[f.ov_id]) {
                ovs[f.ov_id] = {
                    id: f.ov_id,
                    numero: f.tranid,
                    fecha: f.fecha,
                    subsidiariaId: f.subsidiary,
                    subsidiaria: f.subsidiaria,
                    estado: f.estado,
                    conTraslado: f.con_traslado === 'T',
                }
            }
        })
        Object.values(clientes).forEach((c) => { c.ovs = Object.values(c.ovs) })
        return clientes
    }

    /** Transportistas activos (ShipItem) como opciones de select: [{ value: id, label: displayname }] */
    function obtenerTransportistas() {
        return ejecutar(sqlQuerys.sqlTransportistas).map((t) => ({ value: String(t.id), label: t.displayname }))
    }

    /** Opciones únicas para un select a partir de las filas: [{ value, label }] */
    function obtenerOpciones(filas, campoId, campoNombre) {
        const opciones = {}
        filas.forEach((f) => {
            const id = f[campoId]
            if (id != null && !opciones[id]) opciones[id] = { value: String(id), label: f[campoNombre] }
        })
        return Object.values(opciones)
    }

    /** Fila de sqlDespachos → objeto que usa el frontend. */
    function mapearDespacho(f) {
        return {
            id: f.despacho_id,
            numero: f.numero,
            fecha: f.fecha,
            clienteId: f.cliente_id,
            cliente: f.cliente,
            ubicacionId: f.ubicacion_id,
            ubicacion: f.ubicacion,
            subsidiariaId: f.subsidiaria_id,
            subsidiaria: f.subsidiaria,
            ovId: f.ov_id,
            ovNumero: f.ov_numero,
            responsableId: f.responsable_id,
            responsable: f.responsable,
            nota: f.nota,
            transporteInicial: f.transporte_inicial,
            transporteFinal: f.transporte_final,
            valorDeclarado: f.valor_declarado,
            direccion: f.direccion,
            remito: f.remito_id
                ? { id: f.remito_id, numero: f.remito_numero, tipo: f.remito_tipo, fecha: f.remito_fecha }
                : null,
            estadoRemito: Number(f.estado_remito_id) || 0,
        }
    }

    return {
        onRequest: onRequest
    }
})
