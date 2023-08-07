const bcrypt = require('bcrypt')
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const sql = require('mssql');

passport.use(new LocalStrategy({
    email: 'email', // nombre del campo para el email
    password: 'password', // nombre del campo para la contraseña
}, async (email, password, done) => {
    try {
        // Configuración de la conexión a la base de datos
        const config = {
            user: 'sqlserver',
            password: '5Guejd88RAZMwgK',
            server: '34.69.6.193',
            database: 'monas2based',
            options: {
                encrypt: true // si estás usando Azure
            }
        };
        
        // Establecer la conexión a la base de datos
        const pool = await sql.connect(config);
        
        // Ejecutar la consulta para buscar el usuario por email y contraseña
        const result = await pool.request()
            .input('email', sql.NVarChar, email)
            .input('password', sql.NVarChar, password)
            .query('SELECT * FROM users_table WHERE email = @email AND password = @password');
        
        // Si se encontró un usuario con las credenciales proporcionadas
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            return done(null, user);
        } else {
            return done(null, false, { message: 'Credenciales incorrectas.' });
        }
    } catch (error) {
        return done(error);
    }
}));

// Serialización del usuario
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialización del usuario
passport.deserializeUser(async (user, done) => {
    try {
        // Configuración de la conexión a la base de datos
        const config = {
            user: 'sqlserver',
            password: '5Guejd88RAZMwgK',
            server: '34.69.6.193',
            database: 'monas2based',
            options: {
                encrypt: true // si estás usando Azure
            }
        };
        
        // Establecer la conexión a la base de datos
        const pool = await sql.connect(config);
        
        // Ejecutar la consulta para buscar el usuario por id
        const result = await pool.request()
            .input('email', sql.Int, email)
            .query('SELECT * FROM users_table WHERE email = @email');
        
        // Si se encontró un usuario con el id proporcionado
        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            return done(null, user);
        } else {
            return done(new Error('Usuario no encontrado.'));
        }
    } catch (error) {
        return done(error);
    }
});
