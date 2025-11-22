const db = require("../database/db");
const fs = require("fs");
const csv = require("csv-parser");

// Get all products
exports.getProducts = (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
};

// Update product and inventory history
exports.updateProduct = (req, res) => {
  const { id } = req.params;
  const { name, stock, unit, category, brand, status } = req.body;

  db.get("SELECT stock FROM products WHERE id = ?", [id], (err, product) => {
    if (err || !product) return res.status(404).json({ error: "Product not found" });

    if (product.stock !== stock) {
      db.run(
        "INSERT INTO inventory_history (product_id, old_quantity, new_quantity, change_date) VALUES (?, ?, ?, ?)",
        [id, product.stock, stock, new Date().toISOString()]
      );
    }

    db.run(
      "UPDATE products SET name=?, stock=?, unit=?, category=?, brand=?, status=? WHERE id=?",
      [name, stock, unit, category, brand, status, id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Product updated successfully" });
      }
    );
  });
};

// Get inventory history
exports.getHistory = (req, res) => {
  const { id } = req.params;
  db.all(
    "SELECT * FROM inventory_history WHERE product_id = ? ORDER BY change_date DESC",
    [id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
};

// Import CSV products
exports.importProducts = (req, res) => {
  const fileRows = [];
  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (row) => fileRows.push(row))
    .on("end", () => {
      let added = 0;
      let skipped = 0;
      fileRows.forEach((product) => {
        db.get("SELECT id FROM products WHERE name = ?", [product.name], (err, row) => {
          if (row) skipped++;
          else {
            db.run(
              "INSERT INTO products (name, unit, category, brand, stock, status) VALUES (?, ?, ?, ?, ?, ?)",
              [product.name, product.unit, product.category, product.brand, parseInt(product.stock), "In Stock"]
            );
            added++;
          }
        });
      });
      fs.unlinkSync(req.file.path);
      res.json({ added, skipped });
    });
};

// Export products as CSV
exports.exportProducts = (req, res) => {
  db.all("SELECT * FROM products", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    let csvData = "name,unit,category,brand,stock,status\n";
    rows.forEach((p) => {
      csvData += `${p.name},${p.unit},${p.category},${p.brand},${p.stock},${p.status}\n`;
    });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=products.csv");
    res.send(csvData);
  });
};
