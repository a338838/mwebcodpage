if(process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
//const methodOverride = require('method-override')
const LocalStrategy = require('passport-local').Strategy;
const fs = require('fs');
const sql = require('mssql');
const pdf = require('html-pdf');
const ejs = require('ejs');
const jspdf = require('jspdf');
const puppeteer = require('puppeteer');




app.set('view engine', 'ejs')
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
//app.use(methodOverride('_method'))

// =====================================
passport.use(new LocalStrategy({
  usernameField: 'email', // nombre del campo para el email
  passwordField: 'password',  // nombre del campo para el password
}, async (email, password, done) => {
  try {
      // Configuración de la conexión a la base de datos
      const config = {
          user: 'sqlserver',
          password: '5Guejd88RAZMwgK',
          server: '34.29.58.51',
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
  done(null, user.email);
});

// Deserialización del usuario
passport.deserializeUser(async (email, done) => {
  try {
      // Configuración de la conexión a la base de datos
      const config = {
        user: 'sqlserver',
        password: '5Guejd88RAZMwgK',
        server: '34.29.58.51',
        database: 'monas2based',
          options: {
              encrypt: true // si estás usando Azure
          }
      };
      
      // Establecer la conexión a la base de datos
      const pool = await sql.connect(config);
      
      // Ejecutar la consulta para buscar el usuario por id
      const result = await pool.request()
          .input('email', sql.VarChar, email)
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

// ===================================================================================




//BASE DE DATOS
const DBconfig = {
  user: 'sqlserver',
  password: '5Guejd88RAZMwgK',
  server: '34.29.58.51',
  database: 'monas2based',
  options: {
      encrypt: true, // Si estás usando una conexión segura SSL/TLS
      trustServerCertificate: true, // Si estás usando un certificado autofirmado
  },
};

sql.connect(DBconfig).then(() => {
  console.log('Conexión exitosa a la base de datos');
}).catch((err) => {
  console.log('Error al conectar a la base de datos:', err);
});





// PAGINA PRINCIPAL
app.get('/',checkAuthenticated, (req, res) => {
    res.render('index.ejs', {name: req.user.email})
})
// LOGIN
app.get('/login',checkNotAuthenticated,  (req, res) => {
    res.render('login.ejs')  
    
    //TEST CONECT
//    const query = 'SELECT * FROM users_table';
//
//    sql.query(query).then((result) => {
//        console.log('Resultados de la consulta:', result);
  //  }).catch((err) => {
    //    console.log('Error al ejecutar la consulta:', err);
   // });
})



app.post('/login',checkNotAuthenticated, passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
async function(req, res) {
  try {
    // Obtener la información necesaria para la entrada
    const email = req.user.email;
    const login_date = new Date().toISOString().slice(0, 19).replace('T', ' ');
    
    // Crear la consulta SQL para insertar los datos
    const query = `
        INSERT INTO userlog_table (username, logindate)
        VALUES ('${email}', '${login_date}')`;
    
    // Ejecutar la consulta SQL
    const result = await new sql.Request().query(query);

  //redireccionar
  res.redirect('/');

  } catch (error) {
    console.error(error);
    res.status(500).send('Error interno del servidor');
  }
});

// FORMULARIO
app.get('/register',checkNotAuthenticated,  (req, res) => {
    res.render('register.ejs')    
})

app.post('/register',checkNotAuthenticated,  async (req, res) => {
    try{
          //FIN DB
          const sqlRequest = new sql.Request();
          const name = req.body.name;
          const email = req.body.email;
          const password = req.body.password;
          const query = 'INSERT INTO users_table (username, email, password) VALUES (@username, @email, @password)';
          sqlRequest.input('username', sql.VarChar(20), name);
          sqlRequest.input('email', sql.VarChar(50), email);
          sqlRequest.input('password', sql.VarChar(80), password);
          
          sqlRequest.query(query).then((result) => {
              console.log('Resultados de la consulta:', result);
          }).catch((err) => {
              console.log('Error al ejecutar la consulta:', err);
          });
          
          
          //FIN DB
        res.redirect('/login')
    } catch {
        res.redirect('/register')
    }
})


// CERRADO DE SESION [BOTON]
app.post('/logout', async(req, res, next) => {
  
    try {
      const pool = await sql.connect(DBconfig);
      // Crea un objeto de consulta SQL
      const request = await pool.request();
  
      // Define la consulta SQL a ejecutar
      const username = req.user.email;
      console.log(`username: ${username}`);
      const query = `UPDATE userlog_table SET logoutdate = GETDATE() WHERE username = '${username}' AND logoutdate IS NULL`;
  
      // Ejecuta la consulta SQL
      const result = request.query(query);
  
      console.log(`Se ha registrado la salida de ${username}`);
    } catch (err) {
      console.error('Error al registrar la salida:', err);
    }

    req.logOut((err) => {
  
      if (err) {
  
        return next(err);
  
      }
  
      res.redirect('/login');
  
    });
  });






    // CODIGO ENVIO PDF  
    app.get('/pdf', (req, res) => {
      const userInput = req.query.user;
      const dateInput = req.query.date;
    
      // Realizar la consulta de usuarios y fechas únicos
      const uniqueUsersQuery = 'SELECT DISTINCT username FROM userlog_table';
      const uniqueDatesQuery = 'SELECT DISTINCT CONVERT(date, logindate) AS logindate FROM userlog_table';
    
      // Consulta para obtener los registros de la tabla de registro de usuarios
      let filterQuery = 'SELECT * FROM userlog_table WHERE 1 = 1';
      const params = {};
    
      if (userInput) {
        filterQuery += ' AND username = @username';
        params.username = userInput;
      }
    
      if (dateInput) {
        filterQuery += ' AND CONVERT(date, logindate) = @logindate';
        params.logindate = new Date(dateInput);
      }
    
      filterQuery += ' ORDER BY logoutdate DESC'; // Ordenar por fecha de cierre de sesión en orden descendente
    
      sql.connect(DBconfig, (err) => {
        if (err) console.log(err);
    
        // Crear una nueva solicitud de SQL para obtener usuarios únicos
        const usersRequest = new sql.Request();
        // Ejecutar la consulta de usuarios únicos
        usersRequest.query(uniqueUsersQuery, (err, usersResult) => {
          if (err) console.log(err);
    
          // Crear una nueva solicitud de SQL para obtener fechas únicas
          const datesRequest = new sql.Request();
          // Ejecutar la consulta de fechas únicas
          datesRequest.query(uniqueDatesQuery, (err, datesResult) => {
            if (err) console.log(err);
    
            // Crear una nueva solicitud de SQL para obtener registros filtrados
            const filterRequest = new sql.Request();
            // Asignar los parámetros a la consulta
            Object.entries(params).forEach(([key, value]) => {
              filterRequest.input(key, value);
            });
            // Ejecutar la consulta de registros filtrados
            filterRequest.query(filterQuery, (err, filterResult) => {
              if (err) console.log(err);
    
              // Renderizar la plantilla EJS y pasar los datos
              res.render('pdf', {
                usuarios: usersResult.recordset,
                fechas: datesResult.recordset,
                registros: filterResult.recordset,
              });
            });
          });
        });
      });
    });
    

    app.get('/generate-pdf', async (req, res) => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(req.headers.referer, { waitUntil: 'networkidle2' });
      const pdf = await page.pdf({ format: 'A4' });
      await browser.close();
      res.contentType('application/pdf');
      res.send(pdf);
    });
    


function checkAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
        next()
}

const port = process.env.PORT || 3000;
const host = process.env.HOST || 'monas2dwebcore.run.app';

app.listen(port, host, () => {
  console.log(`Servidor corriendo en http://${host}:${port}`);
});
