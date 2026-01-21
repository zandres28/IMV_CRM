import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role } from '../entities/Role';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthRequest } from '../middlewares/auth.middleware';

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

export const AuthController = {
  /**
   * Login de usuario
   */
  login: async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Validar que se proporcionen email y password
      if (!email || !password) {
        return res.status(400).json({ 
          message: 'Email y contraseña son requeridos' 
        });
      }

      // Buscar usuario por email
      const user = await userRepository.findOne({
        where: { email },
        relations: ['roles']
      });

      if (!user) {
        return res.status(401).json({ 
          message: 'Credenciales inválidas' 
        });
      }

      // Verificar que el usuario esté activo
      if (!user.isActive) {
        return res.status(401).json({ 
          message: 'Usuario inactivo. Contacta al administrador.' 
        });
      }

      // Verificar contraseña
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Credenciales inválidas' 
        });
      }

      // Generar tokens
      const accessToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: user.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
      );

      // Preparar datos del usuario (sin password)
      const { password: _, ...userWithoutPassword } = user;

      return res.json({
        message: 'Login exitoso',
        user: userWithoutPassword,
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Error en login:', error);
      return res.status(500).json({ 
        message: 'Error al iniciar sesión', 
        error 
      });
    }
  },

  /**
   * Registro de nuevo usuario
   */
  register: async (req: Request, res: Response) => {
    try {
      const { email, password, firstName, lastName, roleNames } = req.body;

      // Validar campos requeridos
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ 
          message: 'Email, contraseña, nombre y apellido son requeridos' 
        });
      }

      // Verificar que el email no exista
      const existingUser = await userRepository.findOne({ where: { email } });
      
      if (existingUser) {
        return res.status(400).json({ 
          message: 'El email ya está registrado' 
        });
      }

      // Validar longitud de la contraseña
      if (password.length < 6) {
        return res.status(400).json({ 
          message: 'La contraseña debe tener al menos 6 caracteres' 
        });
      }

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Buscar roles (por defecto asignar rol 'usuario' si no se especifica)
      let roles: Role[] = [];
      if (roleNames && roleNames.length > 0) {
        roles = await roleRepository.find({
          where: roleNames.map((name: string) => ({ name }))
        });
      } else {
        const defaultRole = await roleRepository.findOne({ where: { name: 'usuario' } });
        if (defaultRole) {
          roles = [defaultRole];
        }
      }

      // Crear nuevo usuario
      const newUser = userRepository.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        roles
      });

      const savedUser = await userRepository.save(newUser);

      // Generar tokens
      const accessToken = jwt.sign(
        { userId: savedUser.id, email: savedUser.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      const refreshToken = jwt.sign(
        { userId: savedUser.id, type: 'refresh' },
        JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as jwt.SignOptions
      );

      // Preparar datos del usuario (sin password)
      const { password: _, ...userWithoutPassword } = savedUser;

      return res.status(201).json({
        message: 'Usuario registrado exitosamente',
        user: userWithoutPassword,
        accessToken,
        refreshToken
      });
    } catch (error) {
      console.error('Error en registro:', error);
      return res.status(500).json({ 
        message: 'Error al registrar usuario', 
        error 
      });
    }
  },

  /**
   * Refrescar token de acceso
   */
  refreshToken: async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ 
          message: 'Refresh token requerido' 
        });
      }

      // Verificar el refresh token
      const decoded = jwt.verify(refreshToken, JWT_SECRET) as { 
        userId: number; 
        type: string 
      };

      if (decoded.type !== 'refresh') {
        return res.status(401).json({ 
          message: 'Token inválido' 
        });
      }

      // Buscar usuario
      const user = await userRepository.findOne({
        where: { id: decoded.userId, isActive: true },
        relations: ['roles']
      });

      if (!user) {
        return res.status(401).json({ 
          message: 'Usuario no encontrado o inactivo' 
        });
      }

      // Generar nuevo access token
      const newAccessToken = jwt.sign(
        { userId: user.id, email: user.email },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
      );

      return res.json({
        accessToken: newAccessToken
      });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({ 
          message: 'Token inválido o expirado' 
        });
      }
      console.error('Error al refrescar token:', error);
      return res.status(500).json({ 
        message: 'Error al refrescar token', 
        error 
      });
    }
  },

  /**
   * Obtener información del usuario autenticado
   */
  me: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'No autenticado' 
        });
      }

      const { password: _, ...userWithoutPassword } = req.user;
      
      return res.json(userWithoutPassword);
    } catch (error) {
      console.error('Error al obtener perfil:', error);
      return res.status(500).json({ 
        message: 'Error al obtener información del usuario', 
        error 
      });
    }
  },

  /**
   * Cambiar contraseña
   */
  changePassword: async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'No autenticado' 
        });
      }

      const { currentPassword, newPassword } = req.body;

      // Validar campos
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: 'Contraseña actual y nueva contraseña son requeridas' 
        });
      }

      // Validar longitud de la nueva contraseña
      if (newPassword.length < 6) {
        return res.status(400).json({ 
          message: 'La nueva contraseña debe tener al menos 6 caracteres' 
        });
      }

      // Buscar usuario con password
      const user = await userRepository.findOne({ 
        where: { id: req.user.id } 
      });

      if (!user) {
        return res.status(404).json({ 
          message: 'Usuario no encontrado' 
        });
      }

      // Verificar contraseña actual
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          message: 'Contraseña actual incorrecta' 
        });
      }

      // Hash de la nueva contraseña
      user.password = await bcrypt.hash(newPassword, 10);
      await userRepository.save(user);

      return res.json({ 
        message: 'Contraseña actualizada exitosamente' 
      });
    } catch (error) {
      console.error('Error al cambiar contraseña:', error);
      return res.status(500).json({ 
        message: 'Error al cambiar contraseña', 
        error 
      });
    }
  },

  /**
   * Logout (opcional - en el cliente simplemente se elimina el token)
   */
  logout: async (req: AuthRequest, res: Response) => {
    try {
      // En una implementación con blacklist de tokens o sesiones en DB,
      // aquí se invalidaría el token
      return res.json({ 
        message: 'Logout exitoso' 
      });
    } catch (error) {
      console.error('Error en logout:', error);
      return res.status(500).json({ 
        message: 'Error al cerrar sesión', 
        error 
      });
    }
  }
};
