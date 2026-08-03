import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import mysql from "mysql2/promise";
import multer from "multer";
import fs from "fs";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { exec } from "child_process";


dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ---------------- Middleware ----------------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files (images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "public")));

// ---------------- Database Pool ----------------
const dbPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASS,
  database: "pharmatrack",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Helper for queries
async function queryDB(sql, params = []) {
  const [rows] = await dbPool.execute(sql, params);
  return rows;
}

// ---------------- File Upload Setup ----------------

// --- User Images ---
const userUploadsDir = path.join(__dirname, "uploads/users");
fs.mkdirSync(userUploadsDir, { recursive: true });

const uploadUserImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, userUploadsDir),
    filename: (req, file, cb) =>
      cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "")),
  }),
});

// --- Product Images ---
const productUploadsDir = path.join(__dirname, "uploads/products");
fs.mkdirSync(productUploadsDir, { recursive: true });

const uploadProductImage = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, productUploadsDir),
    filename: (req, file, cb) =>
      cb(null, Date.now() + "-" + file.originalname.replace(/\s/g, "")),
  }),
});

// ---------------- API ROUTES ----------------

// ---------- USERS ----------
app.get("/api/users", async (req, res) => {
  try {
    const users = await queryDB(
      "SELECT id, username, fullName, email, role, image, created_at FROM users"
    );
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await queryDB(
      "SELECT id, username, fullName, email, role, image FROM users WHERE id=?",
      [Number(id)]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/users", uploadUserImage.single("image"), async (req, res) => {
  try {
    const { username, fullName, email, role, password } = req.body;
    if (!username || !fullName || !email || !role || !password)
      return res.status(400).json({ message: "All fields are required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const image = req.file ? `/uploads/users/${req.file.filename}` : null;

    const result = await queryDB(
      "INSERT INTO users (username, fullName, email, role, password, image, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())",
      [username, fullName, email, role, hashedPassword, image]
    );

    res.status(201).json({ message: "User added", id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/users/:id", uploadUserImage.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, role, password } = req.body;
    const image = req.file ? `/uploads/users/${req.file.filename}` : null;

    const updates = [];
    const params = [];

    if (fullName) { updates.push("fullName=?"); params.push(fullName); }
    if (email) { updates.push("email=?"); params.push(email); }
    if (role) { updates.push("role=?"); params.push(role); }
    if (password) { 
      const hashed = await bcrypt.hash(password, 10);
      updates.push("password=?"); params.push(hashed);
    }
    if (image) { updates.push("image=?"); params.push(image); }

    if (!updates.length) return res.status(400).json({ message: "No fields to update" });

    params.push(id);
    await queryDB(`UPDATE users SET ${updates.join(", ")} WHERE id=?`, params);
    res.json({ message: "User updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await queryDB("DELETE FROM users WHERE id=?", [id]);
    res.json({ message: "User deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Change password
app.put("/api/users/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    const rows = await queryDB("SELECT password FROM users WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ message: "User not found" });

    const valid = await bcrypt.compare(currentPassword, rows[0].password);
    if (!valid) return res.status(401).json({ message: "Current password incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await queryDB("UPDATE users SET password=? WHERE id=?", [hashed, id]);

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- LOGIN ----------
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const users = await queryDB("SELECT id, username, password, role FROM users WHERE username=?", [username]);
    if (!users.length) return res.status(401).json({ message: "Invalid username or password" });

    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) return res.status(401).json({ message: "Invalid username or password" });

    res.json({ message: "Login successful", userId: users[0].id, role: users[0].role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- PRODUCTS ----------
app.get("/api/products", async (req, res) => {
  try {
    const products = await queryDB(`
      SELECT 
        p.id,
        p.name,
        p.quantity,
        p.price,
        p.expiry_date,
        p.image,
        p.reorder_level,
        p.reorder_qty,
        p.supplier_id,               
        c.name AS category_name,
        s.name AS supplier_name         
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `);
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});




app.post("/api/products", async (req, res) => {
  try {
    const { name, category_id, quantity, price, expiry_date, image, supplier_id, reorder_level, reorder_qty } = req.body;

    await queryDB(
      `INSERT INTO products
      (name, category_id, quantity, price, expiry_date, image, supplier_id, reorder_level, reorder_qty)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        category_id || null,
        quantity,
        price,
        expiry_date,
        image || null,
        supplier_id || null,
        reorder_level || 0,
        reorder_qty || 0
      ]
    );

    res.status(201).json({ message: "Product added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


app.put("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, quantity, price, expiry_date, image, supplier_id, reorder_level, reorder_qty } = req.body;

    await queryDB(
      `UPDATE products SET
        name=?, category_id=?, quantity=?, price=?, expiry_date=?, image=?, supplier_id=?, reorder_level=?, reorder_qty=?
       WHERE id=?`,
      [
        name,
        category_id || null,
        quantity,
        price,
        expiry_date,
        image || null,
        supplier_id || null,
        reorder_level || 0,
        reorder_qty || 0,
        id
      ]
    );

    res.json({ message: "Product updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



app.delete("/api/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await queryDB("DELETE FROM products WHERE id=?", [id]);
    res.json({ message: "Product deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/products/upload", uploadProductImage.single("image"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  res.json({ filename: req.file.filename, url: `/uploads/products/${req.file.filename}` });
});

// ---------- CATEGORIES ----------
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await queryDB("SELECT id, name, description FROM categories");
    res.json(categories);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    await queryDB("INSERT INTO categories(name, description) VALUES(?, ?)", [name, description || null]);
    res.status(201).json({ message: "Category added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    await queryDB("UPDATE categories SET name=?, description=? WHERE id=?", [name, description || null, id]);
    res.json({ message: "Category updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await queryDB("DELETE FROM categories WHERE id=?", [id]);
    res.json({ message: "Category deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- SUPPLIERS ----------
app.get("/api/suppliers", async (req, res) => {
  try {
    const suppliers = await queryDB(`
      SELECT s.id, s.name, s.contact, s.email, s.address, s.category_id, c.name AS category
      FROM suppliers s
      LEFT JOIN categories c ON s.category_id = c.id
      ORDER BY s.name
    `);
    res.json(suppliers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/suppliers", async (req, res) => {
  try {
    const { name, category_id, contact, email, address } = req.body;
    await queryDB(
      "INSERT INTO suppliers (name, category_id, contact, email, address, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
      [name, category_id || null, contact, email, address]
    );
    res.status(201).json({ message: "Supplier added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category_id, contact, email, address } = req.body;
    await queryDB(
      "UPDATE suppliers SET name=?, category_id=?, contact=?, email=?, address=? WHERE id=?",
      [name, category_id || null, contact, email, address, id]
    );
    res.json({ message: "Supplier updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/suppliers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await queryDB("DELETE FROM suppliers WHERE id=?", [id]);
    res.json({ message: "Supplier deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- SALES ----------
app.get("/api/sales", async (req, res) => {
  try {
    const sales = await queryDB("SELECT id, date, customer, product, quantity, price FROM sales");
    res.json(sales);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/sales", async (req, res) => {
  try {
    const { date, customer, product, quantity, price } = req.body;
    await queryDB(
      "INSERT INTO sales(date, customer, product, quantity, price) VALUES(?,?,?,?,?)",
      [date, customer, product, quantity, price]
    );
    res.status(201).json({ message: "Sale added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.put("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, customer, product, quantity, price } = req.body;
    await queryDB(
      "UPDATE sales SET date=?, customer=?, product=?, quantity=?, price=? WHERE id=?",
      [date, customer, product, quantity, price, id]
    );
    res.json({ message: "Sale updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/api/sales/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await queryDB("DELETE FROM sales WHERE id=?", [id]);
    res.json({ message: "Sale deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- RESTOCK & REORDER ----------
app.get("/api/restock-predictions", async (req, res) => {
  try {
    const products = await queryDB("SELECT id, name, quantity FROM products");
    const predictions = products
      .filter(p => p.quantity < 10)
      .map(p => ({ product: p.name, current_stock: p.quantity, suggested_stock: 20 }));
    res.json(predictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/api/reorders", async (req, res) => {
  try {
    const rScriptPath = path.join(__dirname, "forecast_sales.R");
    const rExe = `"C:\\Program Files\\R\\R-4.5.2\\bin\\Rscript.exe"`;

    exec(`${rExe} --vanilla "${rScriptPath}" 7`, (error, stdout, stderr) => {
      if (error) {
        console.error("R execution error:", error);
        return res.status(500).json({ message: "Failed to calculate forecast" });
      }
      if (stderr) console.error("R stderr:", stderr);

      try {
        const data = JSON.parse(stdout);

        // Map output for frontend
        const reorders = data.map(p => ({
          id: p.product,                 // can be replaced with DB product ID if needed
          product: p.product,
          current_stock: p.current_stock,
          suggested_order: p.suggested_restock,
          supplier: "-",                 // optionally fetch from DB if you want supplier
          daily_forecast: p.daily_forecast,
          predicted_stock_by_day: p.predicted_stock_by_day
        }));

        res.json(reorders);

      } catch (parseErr) {
        console.error("Failed to parse R output:", parseErr, stdout);
        res.status(500).json({ message: "Invalid forecast output" });
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/api/send-reorder", async (req, res) => {
  const { productId } = req.body;
  try {
    const [product] = await queryDB(`
      SELECT p.name, p.reorder_qty, s.email, s.name AS supplier
      FROM products p
      JOIN suppliers s ON p.supplier_id = s.id
      WHERE p.id=?
    `, [productId]);

    if (!product) return res.status(404).json({ message: "Product not found" });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"PharmaTrack" <${process.env.EMAIL_USER}>`,
      to: product.email,
      subject: "Reorder Request",
      html: `
        <p>Dear ${product.supplier},</p>
        <p>We would like to place a reorder for:</p>
        <ul>
          <li><strong>Product:</strong> ${product.name}</li>
          <li><strong>Quantity:</strong> ${product.reorder_qty}</li>
        </ul>
        <p>Please confirm availability.</p>
        <p>— PharmaTrack System</p>
      `,
    });

    res.json({ message: "Reorder email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});



// ---------- AI CHAT (Inventory-aware) ----------
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  try {
    const msg = message.toLowerCase();

    // --- 1. Check for low stock queries ---
    if (msg.includes("low stock") || msg.includes("running out") || msg.includes("need to reorder")) {
      const lowStock = await queryDB(`
        SELECT id, name, quantity, reorder_level 
        FROM products WHERE quantity <= reorder_level
      `);
      if (!lowStock.length) {
        return res.json({ reply: "All items are well-stocked 👍" });
      }
      const reply = lowStock.map(p => `${p.name}: ${p.quantity} units left (Reorder level: ${p.reorder_level})`).join("\n");
      return res.json({ reply: `⚠️ Low stock items:\n${reply}` });
    }

    // --- 2. Check for all products request ---
    if (msg.includes("all products") || msg.includes("show inventory")) {
      const products = await queryDB("SELECT name, quantity FROM products");
      const reply = products.map(p => `${p.name}: ${p.quantity} units`).join("\n");
      return res.json({ reply });
    }

    // --- 3. Check for forecast queries ---
    if (msg.includes("forecast") || msg.includes("predict stock") || msg.includes("will run out")) {
      // Simple extraction of product name from message (improve with NLP if needed)
      const match = message.match(/forecast\s(.+)/i) || message.match(/predict\s(.+)/i);
      const productName = match ? match[1].trim() : null;

      if (!productName) {
        return res.json({ reply: "Please specify the product you want to forecast." });
      }

      // Find product
      const [product] = await queryDB("SELECT id, name FROM products WHERE name LIKE ?", [`%${productName}%`]);
      if (!product) return res.json({ reply: `I couldn't find a product named "${productName}".` });

      // Call your existing sales forecast R endpoint
      const forecastRes = await fetch(`http://localhost:${port}/api/predict-sales?days=14`);
      const forecastData = await forecastRes.json();

      // Match forecast for this product (example assumes forecastData is [{product, predicted_stock, date}])
      const productForecast = forecastData.filter(f => f.product.toLowerCase() === product.name.toLowerCase());
      if (!productForecast.length) return res.json({ reply: `No forecast data available for ${product.name}.` });

      const reply = productForecast.map(f => `${f.date}: predicted stock ${f.predicted_stock} units`).join("\n");
      return res.json({ reply });
    }

    // --- 4. Fallback: general AI response ---
    const response = await fetch("https://openrouter.ai/api/v1/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistralai/devstral-2512:free",
        prompt: `You are a helpful pharmacy assistant. ${message}`,
        max_new_tokens: 256,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter RAW RESPONSE:", text);
      return res.status(500).json({ reply: "AI request failed" });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.text || "No reply from AI";
    res.json({ reply });

  } catch (err) {
    console.error("AI CHAT ERROR:", err);
    res.status(500).json({ reply: "Server error in AI chat." });
  }
});




// ---------- PREDICT SALES (R Script) ----------
app.get("/api/predict-sales", async (req, res) => {
  try {
    const days = Number(req.query.days) || 7; // default 7 days
    const rScriptPath = path.join(__dirname, "forecast_sales.R");
    const rExe = `"C:\\Program Files\\R\\R-4.5.2\\bin\\Rscript.exe"`;

    exec(`${rExe} --vanilla "${rScriptPath}" ${days}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`R execution error: ${error.message}`);
        return res.status(500).json({ error: "Forecast failed" });
      }
      if (stderr) console.error(`R stderr: ${stderr}`);

      try {
        const forecast = JSON.parse(stdout);
        res.json(forecast);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr, "Output was:", stdout);
        res.status(500).json({ error: "Failed to parse forecast output" });
      }
    });

  } catch (err) {
    console.error("Predict sales route error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});






// ---------- 404 FOR ASSETS ----------
app.use((req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  if (req.path.includes(".")) {
    return res.status(404).send("Asset not found");
  }
  next();
});

// ---------- SPA FALLBACK ----------
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard.html")));
app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "public", "dashboard.html")));

// ---------- START SERVER ----------
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
