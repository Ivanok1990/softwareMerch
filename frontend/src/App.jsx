import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [productos, setProductos] = useState([]);
    const [pedido, setPedido] = useState([]);
    const [userInfo, setUserInfo] = useState({
        nombre: '',
        numero: '',
        correo: ''
    });

    // Obtener productos desde el backend
    useEffect(() => {
        fetch('http://localhost:8080/api/articulos')
            .then(response => response.json())
            .then(data => setProductos(data))
            .catch(error => {
                console.error('Error:', error);
                alert('Hubo un problema al cargar los productos.');
            });
    }, []);

    const handleCantidadChange = (id, cantidad) => {
        setPedido(prevPedido => {
            const existingProduct = prevPedido.find(item => item.id === id);
            if (existingProduct) {
                return prevPedido.map(item =>
                    item.id === id ? { ...item, cantidad } : item
                );
            } else {
                return [...prevPedido, { id, cantidad }];
            }
        });
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setUserInfo({ ...userInfo, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!userInfo.nombre || !userInfo.numero || !userInfo.correo) {
            alert('Por favor, completa todos los campos antes de enviar el pedido.');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/pedidos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre: userInfo.nombre,
                    numero: userInfo.numero,
                    correo: userInfo.correo,
                    articulos: pedido
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error: ${errorText}`);
            }

            const data = await response.json();
            alert(`Pedido recibido: Número de orden ${data.numeroOrden}`);
        } catch (error) {
            console.error('Error al enviar el pedido:', error);
            alert('Hubo un problema al enviar el pedido.');
        }
    };

    return (
        <div>
            <h1>Software Club MERCH'S</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nombre:</label>
                    <input
                        type="text"
                        name="nombre"
                        value={userInfo.nombre}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div>
                    <label>Número de Teléfono:</label>
                    <input
                        type="text"
                        name="numero"
                        value={userInfo.numero}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                <div>
                    <label>Correo Electrónico:</label>
                    <input
                        type="email"
                        name="correo"
                        value={userInfo.correo}
                        onChange={handleInputChange}
                        required
                    />
                </div>
                {productos.map(producto => (
                    <div key={producto.id} className="producto">
                        <h3>{producto.nombre}</h3>
                        <p>Precio: ${producto.precio.toFixed(2)}</p>
                        {producto.imagenUrl && <img src={producto.imagenUrl} alt={producto.nombre} />}
                        <label htmlFor={`cantidad-${producto.id}`}>Cantidad:</label>
                        <input
                            type="number"
                            id={`cantidad-${producto.id}`}
                            min="0"
                            onChange={(e) => handleCantidadChange(producto.id, parseInt(e.target.value))}
                        />
                    </div>
                ))}
                <button type="submit">Hacer Pedido</button>
            </form>
        </div>
    );
}

export default App;
