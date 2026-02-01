// This file previously contained hardcoded data arrays (CITIES, PRODUCTS, PRESENTATIONS, etc.)
// All data is now fetched from Supabase using the appropriate hooks:
// - useCities() for cities and warehouses
// - useProducts() for products
// - usePresentations() for presentations
// - useDestinations() for destinations
// - Users and Orders are managed through Supabase authentication and database

// If you need to add application-wide constants, they should be added here.
// For data that should be stored in the database, use the appropriate Supabase hooks.