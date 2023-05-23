const express = require("express");
const cookieSession = require("cookie-session");
const bcrypt = require("bcryptjs");
const { generateRandomString, getUserByEmail, urlsForUser } = require("./helpers");

const app = express();
const PORT = 8080;

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(
  cookieSession({
    name: "session",
    keys: ["secret-key"],
  })
);

// Middleware function to check if the user is authenticated
const requireLogin = (req, res, next) => {
  const userId = req.session.user_id;
  if (!userId) {
    res.status(401).render("error", { message: "You need to be logged in to access this page." });
    return;
  }
  next();
};

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
};

const users = {
  aJ48lW: {
    id: "aJ48lW",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10),
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10),
  },
};

// ----------------------- GET Routes -----------------------

// Home page
app.get("/", (req, res) => {
  const userId = req.session.user_id;
  if (userId) {
    res.redirect("/urls");
  } else {
    res.send("Hello!");
  }
});

// JSON representation of the URL database
app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// List of URLs created by the logged-in user
app.get("/urls", requireLogin, (req, res) => {
  const userId = req.session.user_id;
  const userUrls = urlsForUser(userId, urlDatabase);

  const templateVars = {
    urls: userUrls,
    user: users[userId],
    loggedIn: !!userId,
  };
  res.render("urls_index", templateVars);
});

// Create a new URL
app.get("/urls/new", (req, res) => {
  const userId = req.session.user_id;

  if (!userId) {
    res.redirect("/login");
    return;
  }

  const templateVars = {
    user: users[userId],
  };

  res.render("urls_new", templateVars);
});

// Show details of a specific URL
app.get("/urls/:id", requireLogin, (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];

  if (!url) {
    res.status(404).render("error", { message: "URL not found." });
    return;
  }

  const userId = req.session.user_id;

  if (url.userID !== userId) {
    res.status(403).render("error", { message: "You are not authorized to access this URL." });
    return;
  }

  const templateVars = {
    longURL: url.longURL,
    id: shortURL,
    user: users[userId],
  };
  res.render("urls_show", templateVars);
});

// Redirect to the long URL associated with a short URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];

  if (!url) {
    res.status(404).render("error", { message: "URL not found." });
    return;
  }

  res.redirect(url.longURL);
});

// User registration page
app.get("/register", (req, res) => {
  const userId = req.session.user_id;

  if (userId) {
    res.redirect("/urls");
    return;
  }

  const templateVars = {
    user: null,
  };
  res.render("register", templateVars);
});

// User login page
app.get("/login", (req, res) => {
  const userId = req.session.user_id;

  if (userId) {
    res.redirect("/urls");
    return;
  }

  const templateVars = {
    user: null,
  };
  res.render("login", templateVars);
});

// ----------------------- POST Routes -----------------------

// Create a new short URL
app.post("/urls", requireLogin, (req, res) => {
  const longURL = req.body.longURL;
  const userId = req.session.user_id;
  const shortURL = generateRandomString();

  urlDatabase[shortURL] = {
    longURL: longURL,
    userID: userId,
  };

  res.redirect(`/urls/${shortURL}`);
});

// Update a URL
app.post("/urls/:id", requireLogin, (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];

  if (!url) {
    res.status(404).render("error", { message: "URL not found." });
    return;
  }

  const userId = req.session.user_id;

  if (url.userID !== userId) {
    res.status(403).render("error", { message: "You are not authorized to access this URL." });
    return;
  }

  urlDatabase[shortURL].longURL = req.body.longURL;
  res.redirect("/urls");
});

// Delete a URL
app.post("/urls/:id/delete", requireLogin, (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];

  if (!url) {
    res.status(404).render("error", { message: "URL not found." });
    return;
  }

  const userId = req.session.user_id;

  if (url.userID !== userId) {
    res.status(403).render("error", { message: "You are not authorized to access this URL." });
    return;
  }

  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// User registration
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);

  if (!email || !password) {
    res.status(400).render("error", { message: "Email and password are required fields." });
    return;
  }

  const existingUser = getUserByEmail(email, users);
  if (existingUser) {
    res.status(400).render("error", { message: "Email already registered." });
    return;
  }

  const userId = generateRandomString();
  users[userId] = {
    id: userId,
    email: email,
    password: hashedPassword,
  };

  req.session.user_id = userId;
  res.redirect("/urls");
});

// User login
app.post("/login", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const user = getUserByEmail(email, users);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(403).render("error", { message: "Invalid email or password." });
    return;
  }

  req.session.user_id = user.id;
  res.redirect("/urls");
});

// User logout
app.post("/logout", requireLogin, (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`TinyApp listening on port ${PORT}!`);
});