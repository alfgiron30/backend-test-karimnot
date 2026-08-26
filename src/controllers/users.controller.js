import { UserModel } from '../models/user.model.js';
import bcrypt from 'bcrypt';
import { formatUserProfilePicture, uploadFileToS3 } from '../services/s3service.js';

export const getUsers = async (req, res) => {
  try {
    const { page = 0, limit = 10, role, status, search } = req.query;
    const result = await UserModel.findAll({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      role,
      status,
      search,
    });

    if (result && result.users) {
      result.users = await Promise.all(
        result.users.map(async (user) => ({
          ...user,
          profilePicture: await formatUserProfilePicture(user.profilePicture),
        }))
      );
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    user.profilePicture = await formatUserProfilePicture(user.profilePicture);

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el usuario', error: error.message });
  }
};

export const createUser = async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePictureUrl = null;

    if (req.file) {
      profilePictureUrl = await uploadFileToS3(req.file);
    }

    const newUser = await UserModel.create({
      ...rest,
      password: hashedPassword,
      profilePicture: profilePictureUrl,
    });

    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al crear usuario', error: error.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userData = req.body;

    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    let profilePictureUrl = null;

    if (req.file) {
      profilePictureUrl = await uploadFileToS3(req.file);
      userData.profilePicture = profilePictureUrl;
    }

    const updatedUser = await UserModel.update(id, userData);
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await UserModel.delete(id);
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
  }
};