# Instrucciones para Aplicar la Migración

## Paso 1: Aplicar la Migración a Supabase

Debes ejecutar el archivo de migración en tu base de datos de Supabase:

1. Ve a tu proyecto en Supabase: https://bnqbycccmncrkmoziphm.supabase.co
2. Navega a **SQL Editor**
3. Copia y pega el contenido del archivo `add_username_password_migration.sql`
4. Ejecuta el script

## Paso 2: Verificar la Migración

Después de ejecutar la migración, verifica que:
- Las columnas `username` y `password` se hayan agregado correctamente
- Los usuarios existentes tengan valores por defecto
- La restricción UNIQUE en `username` esté activa

## Paso 3: Probar la Creación de Usuarios

Una vez aplicada la migración:
1. Inicia sesión como administrador
2. Ve a la sección de Gestión de Usuarios
3. Intenta crear un nuevo usuario de cada tipo:
   - Vendedor
   - Bodega
   - Producción
   - Repartidor
   - Administrador

## Notas Importantes

- **Contraseña por defecto**: Los usuarios existentes tendrán la contraseña `frutos123`
- **Usernames existentes**: Se generaron automáticamente desde los emails (parte antes del @)
- **Relación 1-a-muchos**: Recuerda que las bodegas pueden tener múltiples encargados asignados a la misma ciudad

## Archivos Modificados

- ✅ `add_username_password_migration.sql` - Script de migración
- ✅ `supabase_schema.sql` - Schema actualizado para futuras instalaciones
