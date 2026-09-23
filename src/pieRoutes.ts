// In this file, we'll be making each RESTful API route
// POST
// PUT
// DELETE

import { Router, Request, Response } from "express";
import { pool } from "./db";
import { validateResource } from "./validate";
import { createPieSchema, updatePieSchema } from "./schemas";
import { authenticateToken } from "./authMiddleware";

const router = Router();

// GET
router.get("/", async (req: Request, res: Response) => {
  // access the db
  const { search } = req.query;

  try {
    const result = await pool.query(
      "SELECT * FROM pies WHERE name ILIKE $1 ORDER BY id ASC",
      [`%${search ?? ""}%`],
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// POST
router.post(
  "/",
  authenticateToken,
  validateResource(createPieSchema),
  async (req: Request, res: Response) => {
    // retrieve the specific properties of the pie from
    // the request's body
    const { name, crust_type, filling, is_baked, slice_count } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO pies (name, crust_type, filling, is_baked, slice_count)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
        [name, crust_type, filling, is_baked ?? false, slice_count ?? 8],
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

// PUT
router.put(
  "/:id",
  authenticateToken,
  validateResource(updatePieSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, crust_type, filling, is_baked, slice_count } = req.body;
    try {
      let query = `UPDATE pies SET`;
      const params = { name, crust_type, filling, is_baked, slice_count };
      const presentParams = Object.fromEntries(
        Object.entries(params).filter(([_key, value]) => value)
      );
      query = Object.entries(presentParams).reduce((acc, [key, _value], i) => {
        return acc + ` ${key} = $${i + 1} `;
      }, query);

      query += ` WHERE id = $${
        Object.entries(presentParams).length + 1
      } RETURNING *`;

      const result = await pool.query(
        query,
        Object.values(presentParams).concat(id)
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pie not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  }
);


// DELETE
router.delete(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `DELETE FROM pies 
      WHERE id = $1 
      RETURNING *`,
        [id],
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Pie not found" });
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  },
);

export default router;
