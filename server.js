import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src/views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Article = mongoose.model("Article", articleSchema);

const sessions = new Map();

function generateSessionId() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isAuthenticated(req) {
  const sessionId = req.headers.cookie?.split("session=")[1]?.split(";")[0];
  return sessions.has(sessionId);
}

app.get("/", async (req, res) => {
  try {
    const articles = await Article.find().sort({ date: -1 });
    res.render("pages/index", { articles });
  } catch (error) {
    console.error(error);
    res.render("pages/index", { articles: [] });
  }
});

app.get("/article/:id", async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    if (article) {
      res.render("pages/article", { article });
    } else {
      res.status(404).send("Article not found");
    }
  } catch (error) {
    console.error(error);
    res.status(404).send("Article not found");
  }
});

app.get("/login", (req, res) => {
  res.render("pages/login", { error: null });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const sessionId = generateSessionId();
    sessions.set(sessionId, { username });
    res.setHeader("Set-Cookie", `session=${sessionId}; HttpOnly; Path=/`);
    res.redirect("/admin");
  } else {
    res.render("pages/login", { error: "Invalid credentials" });
  }
});

app.get("/logout", (req, res) => {
  const sessionId = req.headers.cookie?.split("session=")[1]?.split(";")[0];
  if (sessionId) {
    sessions.delete(sessionId);
  }
  res.setHeader("Set-Cookie", "session=; Max-Age=0; Path=/");
  res.redirect("/");
});

app.get("/admin", async (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect("/login");
  }
  try {
    const articles = await Article.find().sort({ date: -1 });
    res.render("pages/admin", { articles });
  } catch (error) {
    console.error(error);
    res.render("pages/admin", { articles: [] });
  }
});

app.get("/admin/new", (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect("/login");
  }
  res.render("pages/new");
});

app.post("/admin/new", async (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect("/login");
  }
  try {
    const { title, date, content } = req.body;
    const article = new Article({ title, date, content });
    await article.save();
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.redirect("/admin/new");
  }
});

app.get("/admin/edit/:id", async (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect("/login");
  }
  try {
    const article = await Article.findById(req.params.id);
    if (article) {
      res.render("pages/edit", { article });
    } else {
      res.status(404).send("Article not found");
    }
  } catch (error) {
    console.error(error);
    res.status(404).send("Article not found");
  }
});

app.post("/admin/edit/:id", async (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect("/login");
  }
  try {
    const { title, date, content } = req.body;
    await Article.findByIdAndUpdate(req.params.id, { title, date, content });
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.redirect("/admin");
  }
});

app.post("/admin/delete/:id", async (req, res) => {
  if (!isAuthenticated(req)) {
    return res.redirect("/login");
  }
  try {
    await Article.findByIdAndDelete(req.params.id);
    res.redirect("/admin");
  } catch (error) {
    console.error(error);
    res.redirect("/admin");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
