const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const User = require("../models/User");

const verifyToken = async (req, res, next) => {
  //   let token;
  //   if (
  //     req.headers.authorization &&
  //     req.headers.authorization.startsWith("Bearer")
  //   ) {
  //     token = req.headers.authorization.split(" ")[1];
  //   }
  //   if (!token) {
  //     return res
  //       .status(401)
  //       .json("You are not logged in. Please log in to get access.");
  //   }
  //   const decoded = await promisify(jwt.verify)(token, process.env.JWT_SEC);
  //   const currentUser = await User.findById(decoded.id);
  //   if (!currentUser) {
  //     return res.status(401).json("No user found!");
  //   }
  //   req.user = currentUser;
  //   next();

  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    
    jwt.verify(token, process.env.JWT_SEC, (err, user) => {
      
      if (err) res.status(403).json("Token is not valid!");
      req.user = user;
      next();
    });
  } else {
    return res.status(401).json("You are not authenticated!");
  }
};

const verifyTokenAndAuthorization = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.id === req.params.id || req.user.isAdmin) {
      next();
    } else {
      res.status(403).json("You are not alowed to do that!");
    }
  });
};

const verifyTokenAndAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.isAdmin) {
      next();
    } else {
      res.status(403).json("You are not allowed to do that!");
    }
  });
};

module.exports = {
  verifyToken,
  verifyTokenAndAuthorization,
  verifyTokenAndAdmin,
};
