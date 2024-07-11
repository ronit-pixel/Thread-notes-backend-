const cookieParser = require("cookie-parser");
const express = require("express");
const app = express();
const userModel = require("./models/user");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const postModel = require("./models/post");
const upload=require("./config/multerconfig")

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/profile", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ email: req.user.email }).populate("posts");
  // console.log(user);
  res.render("profile",{user});
});


// likes method
app.get("/like/:id", isLoggedIn, async function (req, res) {
  let post = await postModel.findOne({ _id: req.params.id });

  if (post.likes.indexOf(req.user.userid) === -1) {
    post.likes.push(req.user.userid);
  } else {
    post.likes.splice(post.likes.indexOf(req.user.userid), 1);
  }

  await post.save();
  res.redirect("/profile");
});

// edit page
app.get("/edit/:id",async function(req,res){
  let post = await postModel.findOne({_id:req.params.id}).populate("user")
  res.render("edit",{post})
})

// update page 
app.post("/update/:id", isLoggedIn, async function(req, res){
  let post = await postModel.findOneAndUpdate({_id: req.params.id},{content: req.body.content})
  res.redirect("/profile")
})

// post handling
app.post("/post", isLoggedIn, async function (req, res) {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;

// post database 
  let post = await postModel.create({
    user: user._id,
    content: content,
  });
  user.posts.push(post._id);
  await user.save()
  res.redirect("/profile")
});

// usercreate route
app.post("/register", async function (req, res) {
  let { email, password, name, username, age } = req.body;
  // user database
  let user = await userModel.findOne({ email: email });
  if (user) {
    return res.status(500).send("user already registered");
  }
  bcrypt.genSalt(10, function (err, salt) {
    bcrypt.hash(password, salt, async function (err, hash) {
      let user = await userModel.create({
        email,
        password: hash,
        name,
        username,
        age,
      });
      // token create
      let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token:", token);
      res.send("reigseterd");
    });
  });
});

// login route
app.post("/login", async function (req, res) {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email: email });
  if (!user) {
    return res.status(500).send("Something went wrong");
  }
  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token", token);
      return res.redirect("/profile");
    } else {
      res.redirect("/login");
    }
  });
});

// logout route
app.get("/logout", function (req, res) {
  // token remove delete
  res.cookie("token", "");
  res.redirect("/login");
});

// middleware
function isLoggedIn(req, res, next) {
  if (req.cookies.token === "") {
    return res.redirect("/login");
  } else {
    let data = jwt.verify(req.cookies.token, "shhhh");
    req.user = data;
    next();
  }
}

// profile picture change by multer
app.get("/profile/upload",function(req,res){
  res.render("profilepic")
})
app.post("/upload",isLoggedIn,upload.single('profileimg'),async function(req,res){
 console.log(req.file)
 let user= await userModel.findOne({email:req.user.email})
 user.profilepic=req.file.filename
 await user.save()
 res.redirect("/profile")
})


app.listen(3000);
