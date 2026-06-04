// backend/index.js
const express = require("express");
const cors = require("cors");

const userRoutes = require("./routes/userRoutes")

const app = express();

app.use(cors());
app.use(express.json());

app.use("/users", userRoutes);

app.get("/", (req, res) => {
  res.send("Backend funcionando 🚀");
});

app.listen(4000, () => {
  console.log("Servidor en http://localhost:4000");
});