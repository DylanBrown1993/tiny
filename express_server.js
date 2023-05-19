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
    res.redirect("/login"); // Redirect to the login page if not logged in
  } else {
    next(); // Proceed to the next middleware if logged in
  }
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
  res.send("Hello!");
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
app.get("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const url = urlDatabase[shortURL];

  if (!url) {
    res.status(404).send("URL not found.");
    return;
  }

  const templateVars = {
    longURL: url.longURL,
    id: shortURL,
    user: users[req.session.user_id],
  };
  res.render("urls_show", templateVars);
});

// Redirect to the long URL associated with a short URL
app.get("/u/:id", (req, res) => {
  const shortURL = req.params.id;
  const longURL = urlDatabase[shortURL].longURL;
  res.redirect(longURL);
});

// Registration page
app.get("/register", (req, res) => {
  const templateVars = {
    user: users[req.session.user_id],
  };
  res.render("register", templateVars);
});

// Login page
app.get("/login", (req, res) => {
  const templateVars = {
    user: users[req.session.user_id],
  };
  res.render("login", templateVars);
});

// ----------------------- POST Routes -----------------------

// Update the long URL of a specific short URL
app.post("/urls/:id", (req, res) => {
  const shortURL = req.params.id;
  const newLongURL = req.body.longURL;
  const userId = req.session.user_id;

  if (!userId) {
    res.status(403).send("You are not authorized to perform this action.");
    return;
  }

  if (!urlDatabase[shortURL] || urlDatabase[shortURL].userID !== userId) {
    res.status(404).send("URL not found.");
    return;
  }

  urlDatabase[shortURL].longURL = newLongURL;
  res.redirect("/urls");
});

// Create a new URL
app.post("/urls", (req, res) => {
  const longURL = req.body.longURL;
  const shortURL = generateRandomString();
  const userId = req.session.user_id;

  if (!userId) {
    res.status(403).send("You are not authorized to perform this action.");
    return;
  }

  urlDatabase[shortURL] = {
    longURL: longURL,
    userID: userId,
  };
  res.redirect(`/urls/${shortURL}`);
});

// Delete a specific short URL
app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  const userId = req.session.user_id;

  if (!userId) {
    res.status(403).send("You are not authorized to perform this action.");
    return;
  }

  if (!urlDatabase[shortURL] || urlDatabase[shortURL].userID !== userId) {
    res.status(404).send("URL not found.");
    return;
  }

  delete urlDatabase[shortURL];
  res.redirect("/urls");
});

// User registration
app.post("/register", (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (email === "" || password === "") {
    res.status(400).send("Email and password cannot be empty.");
    return;
  }

  const existingUser = getUserByEmail(email);
  if (existingUser) {
    res.status(400).send("Email already registered.");
    return;
  }

  const userId = generateRandomString();
  const hashedPassword = bcrypt.hashSync(password, 10);
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

  const user = getUserByEmail(email);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    res.status(403).send("Invalid email or password.");
    return;
  }

  req.session.user_id = user.id;
  res.redirect("/urls");
});

// User logout
app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});