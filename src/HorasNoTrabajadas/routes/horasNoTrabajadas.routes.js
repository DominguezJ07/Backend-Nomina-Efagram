import express from "express";
import { crearHorasNoTrabajadas } from "../controllers/horasNoTrabajadas.controller.js";

const router = express.Router();

router.post("/", crearHorasNoTrabajadas);

export default router;