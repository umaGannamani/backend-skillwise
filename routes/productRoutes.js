const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });

router.get("/", productController.getProducts);
router.put("/:id", productController.updateProduct);
router.post("/import", upload.single("csvFile"), productController.importProducts);
router.get("/export", productController.exportProducts);
router.get("/:id/history", productController.getHistory);

module.exports = router;
