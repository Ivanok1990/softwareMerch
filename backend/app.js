const express = require('express');
const mysql = require('mysql');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const path = require('path');
const cors = require('cors');
const port = process.env.PORT || 8080;

const app = express();
app.use(bodyParser.json());
app.use('/imagenes', express.static(path.join(__dirname, 'imagenes')));
app.use(cors());

// Configuración de la base de datos
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'souvenirs_db'
});

const SMTP_CONFIG = {
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    auth: {
        user: "e73bba1d142c8b",
        pass: "1feb803531c738"
    }
};

db.connect(err => {
    if (err) throw err;
    console.log('Conectado a la base de datos.');
});

app.get('/', (req, res) => {
    res.send('funciona');
});

app.get('/api/articulos', (req, res) => {
    db.query('SELECT id, nombre, precio, imagen FROM articulos', (err, results) => {
        if (err) {
            console.error('Error al obtener los artículos:', err);
            return res.status(500).json({ error: 'Error al obtener los artículos' });
        }

        const articulosConImagen = results.map(articulo => ({
            ...articulo,
            imagenUrl: `http://localhost:8080/imagenes/${articulo.imagen}`
        }));

        res.status(200).json(articulosConImagen);
    });
});



app.post('/pedidos', (req, res) => {
    const { nombre, numero, correo, articulos } = req.body;
    const numeroOrden = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

    let total = 0;
    const articuloIds = articulos.map(articulo => articulo.id);

    db.query('SELECT id, nombre, precio FROM articulos WHERE id IN (?)', [articuloIds], (err, results) => {
        if (err) {
            console.error('Error al consultar los artículos:', err);
            return res.status(500).json({ error: 'Error al consultar los artículos' });
        }

        // Calcular el total y preparar los detalles de los artículos
        const detallesArticulos = articulos.map(articulo => {
            const articuloDB = results.find(a => a.id === articulo.id);
            if (articuloDB) {
                total += articuloDB.precio * articulo.cantidad;
                return {
                    articulo_id: articuloDB.id,
                    articulo_nombre: articuloDB.nombre,
                    cantidad: articulo.cantidad
                };
            }
            return null;
        }).filter(Boolean);

        const sqlPedido = 'INSERT INTO pedidos (nombre, numero, correo, total, numero_orden) VALUES (?, ?, ?, ?, ?)';
        db.query(sqlPedido, [nombre, numero, correo, total, numeroOrden], (err, result) => {
            if (err) {
                console.error('Error al guardar el pedido:', err);
                return res.status(500).json({ error: 'Error al guardar el pedido' });
            }

            // Preparar la inserción de los detalles del pedido
            const detallesValues = detallesArticulos.map(detalle => [
                numeroOrden,
                nombre,
                detalle.articulo_id,
                detalle.articulo_nombre,
                detalle.cantidad
            ]);

            const sqlDetalles = 'INSERT INTO detalles_pedidos (numero_orden, nombre, articulo_id, articulo_nombre, cantidad) VALUES ?';
            db.query(sqlDetalles, [detallesValues], (err) => {
                if (err) {
                    console.error('Error al guardar los detalles del pedido:', err);
                    return res.status(500).json({ error: 'Error al guardar los detalles del pedido' });
                }

                // Configuración y envío del correo
                const transporter = nodemailer.createTransport(SMTP_CONFIG);
                const detallesCorreo = detallesArticulos.map(detalle =>
                    `<li>${detalle.articulo_nombre}: ${detalle.cantidad} x $${results.find(a => a.id === detalle.articulo_id).precio.toFixed(2)}</li>`
                ).join('');

                const mailOptions = {
                    from: '"Software Club" <omarrayo899@gmail.com>',
                    to: correo,
                    subject: 'Confirmación de tu pedido',
                    html: `
                        <h2>Hola ${nombre}, tu pedido ha sido recibido</h2>
                        <p><strong>Número de Orden:</strong> ${numeroOrden}</p>
                        <p><strong>Detalles de los artículos:</strong></p>
                        <ul>${detallesCorreo}</ul>
                        <p><strong>Total:</strong> $${total.toFixed(2)}</p>
                        <p>Gracias por tu compra.</p>
                    `
                };

                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.error('Error al enviar el correo:', error);
                        return res.status(500).json({ error: 'Error al enviar el correo' });
                    }
                    console.log('Correo enviado:', info.response);
                    res.status(200).json({ message: 'Pedido recibido y correo enviado', numeroOrden });
                });
            });
        });
    });
});

app.listen(port, () => console.log(`Servidor corriendo en http://localhost:${port}`));
