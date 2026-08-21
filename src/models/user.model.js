import { pool } from "../config/db.js";

export const UserModel = {
  async findAll({ page = 0, limit = 10, role, status, search }) {
    const offset = page * limit;
    const params = [];
    const conditions = [];

    let query = `
    SELECT u.idusuario AS "idUsuario", 
           u.firstname AS "firstName", 
           u.lastname AS "lastName", 
           u.email, 
           u.phonenumber AS "phoneNumber", 
           u.role, 
           u.status, 
           u.profilepicture AS "profilePicture",
           a.idaddress AS "idAddress", 
           a.street, 
           a.number, 
           a.city, 
           a.postalcode AS "postalCode",
           COUNT(*) OVER() AS "totalRecords"
    FROM users u
    LEFT JOIN address a ON u.idaddress = a.idaddress
  `;

    if (role) {
      params.push(role);
      conditions.push(`u.role = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`u.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(
        `(u.firstname ILIKE $${params.length} OR u.lastname ILIKE $${params.length} OR u.email ILIKE $${params.length})`,
      );
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY u.idusuario ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const { rows } = await pool.query(query, params);

    const total = rows.length > 0 ? parseInt(rows[0].totalRecords, 10) : 0;

    const users = rows.map(({ totalRecords, ...user }) => user);

    return { users, total, page: Number(page), limit: Number(limit) };
  },

  async findByEmail(email) {
    const query = `
      SELECT idusuario AS "idUsuario",
             firstname AS "firstName",
             lastname AS "lastName",
             email,
             phonenumber AS "phoneNumber",
             role,
             status,
             password,
             profilepicture AS "profilePicture",
             idaddress AS "idAddress"
      FROM users 
      WHERE email = $1
    `;
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  },

  async findById(idusuario) {
    const query = `
      SELECT u.idusuario AS "idUsuario", 
             u.firstname AS "firstName", 
             u.lastname AS "lastName", 
             u.email, 
             u.phonenumber AS "phoneNumber", 
             u.role, 
             u.status, 
             u.profilepicture AS "profilePicture",
             a.idaddress AS "idAddress", 
             a.street, 
             a.number, 
             a.city, 
             a.postalcode AS "postalCode"
      FROM users u
      LEFT JOIN address a ON u.idaddress = a.idaddress
      WHERE u.idusuario = $1
    `;
    const { rows } = await pool.query(query, [idusuario]);
    return rows[0];
  },

  async create(userData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const addressQuery = `
      INSERT INTO address (street, number, city, postalcode)
      VALUES ($1, $2, $3, $4) 
      RETURNING idaddress AS "idAddress"
    `;
      const addressRes = await client.query(addressQuery, [
        userData.street || null,
        userData.number || null,
        userData.city || null,
        userData.postalCode || null,
      ]);
      const idaddress = addressRes.rows[0]?.idAddress;

      const userQuery = `
      INSERT INTO users (firstname, lastname, email, phonenumber, role, status, password, profilepicture, idaddress)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING idusuario AS "idUsuario", firstname AS "firstName", lastname AS "lastName", email, role, status
    `;
      const userRes = await client.query(userQuery, [
        userData.firstName,
        userData.lastName,
        userData.email,
        userData.phoneNumber || null,
        userData.role || "User",
        userData.status || "Active",
        userData.password,
        userData.profilePicture || null,
        idaddress,
      ]);

      await client.query("COMMIT");
      return userRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error; 
    } finally {
      client.release();
    }
  },

  async update(idusuario, userData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // 1. Obtener el idaddress actual
      const userCurrent = await client.query(
        "SELECT idaddress FROM users WHERE idusuario = $1",
        [idusuario],
      );
      const idaddress = userCurrent.rows[0]?.idaddress;

      // 2. Actualizar dirección si existe
      if (idaddress) {
        const addressQuery = `
          UPDATE address
          SET street = COALESCE($1, street),
              number = COALESCE($2, number),
              city = COALESCE($3, city),
              postalcode = COALESCE($4, postalcode)
          WHERE idaddress = $5
        `;
        await client.query(addressQuery, [
          userData.street || null,
          userData.number || null,
          userData.city || null,
          userData.postalCode || null,
          idaddress,
        ]);
      }

      const userQuery = `
        UPDATE users
        SET firstname = COALESCE($1, firstname),
            lastname = COALESCE($2, lastname),
            email = COALESCE($3, email),
            phonenumber = COALESCE($4, phonenumber),
            role = COALESCE($5, role),
            status = COALESCE($6, status),
            profilepicture = COALESCE($7, profilepicture)
            ${userData.password ? ", password = $8" : ""}
        WHERE idusuario = ${userData.password ? "$9" : "$8"}
        RETURNING idusuario AS "idUsuario", firstname AS "firstName", lastname AS "lastName", email, role, status
      `;

      const params = [
        userData.firstName || null,
        userData.lastName || null,
        userData.email || null,
        userData.phoneNumber || null,
        userData.role || null,
        userData.status || null,
        userData.profilePicture || null,
      ];

      if (userData.password) {
        params.push(userData.password);
      }
      params.push(idusuario);

      const userRes = await client.query(userQuery, params);
      await client.query("COMMIT");
      return userRes.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },

  async delete(idusuario) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userRes = await client.query(
        "SELECT idaddress FROM users WHERE idusuario = $1",
        [idusuario],
      );
      const idaddress = userRes.rows[0]?.idaddress;

      await client.query("DELETE FROM users WHERE idusuario = $1", [idusuario]);
      if (idaddress) {
        await client.query("DELETE FROM address WHERE idaddress = $1", [
          idaddress,
        ]);
      }

      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  },
};
