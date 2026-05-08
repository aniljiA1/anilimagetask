require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const path = require("path");

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const app = express();

const cors = require("cors");

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);
app.use(express.json());

app.use("/uploads", express.static("uploads"));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ✅ UPLOAD API
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    console.log("FILE:", req.file);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No image uploaded",
      });
    }

    // ✅ CALL AI API
    const FormData = require("form-data");
    const fs = require("fs");

    const formData = new FormData();

    formData.append("image", fs.createReadStream(req.file.path));

    const aiResponse = await axios.post(process.env.AI_API_URL, formData, {
      headers: {
        ...formData.getHeaders(),
        "X-Auth-Key": process.env.AI_API_KEY,
      },
    });

    console.log("AI RESPONSE:", aiResponse.data);

    console.log("AI RESPONSE:", aiResponse.data);

    const imageUrl = process.env.BASE_URL + "/uploads/" + req.file.filename;

    // ✅ SAVE DB
    const saved = await prisma.request.create({
      data: {
        image_url: imageUrl,
        output_url: aiResponse.data.output,
      },
    });

    res.json({
      success: true,
      output_url: saved.output_url,
      data: saved,
    });
  } catch (error) {
    console.log("UPLOAD ERROR:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ success: true, message: "Backend running" });
});

// ✅ HISTORY API
app.get("/history", async (req, res) => {
  const data = await prisma.request.findMany({
    orderBy: {
      created_at: "desc",
    },
  });

  res.json(data);
});

app.listen(process.env.PORT, () => {
  console.log(`Server running on ${process.env.PORT}`);
});
