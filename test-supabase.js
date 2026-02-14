// Script de diagnóstico para verificar la conexión con Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bnqbycccmncrkmoziphm.supabase.co';
const supabaseAnonKey = 'sb_publishable_096y6HdU4yQZhPOO0Ufq3A_MWKbMcFM';

console.log('🔍 Verificando conexión con Supabase...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseAnonKey.substring(0, 20) + '...\n');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
    try {
        console.log('📡 Intentando conectar con Supabase...');

        // Test 1: Verificar usuarios
        console.log('\n1️⃣ Consultando usuarios...');
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');

        if (usersError) {
            console.error('❌ Error al consultar usuarios:', usersError);
            console.error('   Código:', usersError.code);
            console.error('   Mensaje:', usersError.message);
            console.error('   Detalles:', usersError.details);
        } else {
            console.log('✅ Usuarios encontrados:', users?.length || 0);
            if (users && users.length > 0) {
                console.log('\n📋 Lista de usuarios:');
                users.forEach((user, index) => {
                    console.log(`   ${index + 1}. ${user.name} (${user.username}) - Rol: ${user.role} - Activo: ${user.is_active}`);
                });
            } else {
                console.log('⚠️  No hay usuarios en la base de datos');
            }
        }

        // Test 2: Verificar ciudades
        console.log('\n2️⃣ Consultando ciudades...');
        const { data: cities, error: citiesError } = await supabase
            .from('cities')
            .select('*');

        if (citiesError) {
            console.error('❌ Error al consultar ciudades:', citiesError.message);
        } else {
            console.log('✅ Ciudades encontradas:', cities?.length || 0);
        }

        // Test 3: Verificar productos
        console.log('\n3️⃣ Consultando productos...');
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('*');

        if (productsError) {
            console.error('❌ Error al consultar productos:', productsError.message);
        } else {
            console.log('✅ Productos encontrados:', products?.length || 0);
        }

        console.log('\n✨ Diagnóstico completado');

    } catch (error) {
        console.error('\n💥 Error crítico:', error);
    }
}

testConnection();
