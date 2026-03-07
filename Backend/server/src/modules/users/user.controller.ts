import type { RequestHandler } from "express";

import {
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserRole
} from "./user.service";
import type { CreateUserInput, UpdateUserInput, UpdateUserRoleInput } from "./user.validation";

export const getUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await listUsers();
    return res.status(200).json({ users });
  } catch (error) {
    return next(error);
  }
};

export const createUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as CreateUserInput;
    const user = await createUser(input);
    return res.status(201).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const updateUserRoleHandler: RequestHandler = async (req, res, next) => {
  try {
    const { role } = req.body as UpdateUserRoleInput;
    const user = await updateUserRole(req.params.id, role);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const updateUserHandler: RequestHandler = async (req, res, next) => {
  try {
    const input = req.body as UpdateUserInput;
    const user = await updateUser(req.params.id, input);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const resetUserPasswordHandler: RequestHandler = async (req, res, next) => {
  try {
    const user = await resetUserPassword(req.params.id);
    return res.status(200).json({ user });
  } catch (error) {
    return next(error);
  }
};

export const deleteUserHandler: RequestHandler = async (req, res, next) => {
  try {
    await deleteUser(req.params.id);
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
};
