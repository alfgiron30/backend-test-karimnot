import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import usersRoutes from './routes/users.routes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get('/healthcheck', (req, res) => {
  res.status(200).send('OK');
});

app.use('/api/pruebaTecnica', authRoutes);
app.use('/api/pruebaTecnica/usuarios', usersRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});