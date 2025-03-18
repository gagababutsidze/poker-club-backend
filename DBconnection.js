import mariadb from 'mariadb';

export const conection = mariadb.createPool({
    host: "bbqrachmh8eqfgdjio9c-mysql.services.clever-cloud.com",
    user: "udkpe2lht4wzblof",
    password: "iaCeU9jMuWxsLT5hqQit",
    database: "bbqrachmh8eqfgdjio9c",
    port: "3306",
    connectionLimit: 10000, // Increased limit for handling higher concurrency
    connectTimeout: 10000000,
  });
  
  export async function queryDatabase(sql, values) {
    try {
      const conn = await conection.getConnection();
      const rows = await conn.query(sql, values);
  
  
      // Convert BigInt values to string
      const result = JSON.parse(JSON.stringify(rows, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
  
      conn.release(); // Release the connection back to the pool
      return result;
      
      
    } catch (err) {
      console.error("Error executing SQL query:", err);
      throw err; // Re-throw the error for handling in the caller
    }
  }