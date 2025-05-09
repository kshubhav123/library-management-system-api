const jwt = require("jsonwebtoken");
const { ApiResponse } = require("./ApiResponse");

const AuthMiddleware = {
  authenticate: (req, res, next) => {
    console.log("Starting");
    
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return ApiResponse.error(
        res,
        ["Authentication token missing"],
        401,
        "Unauthorized"
      );
    }

    const token = authHeader.split(" ")[1];

    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        return ApiResponse.error(
          res,
          [err.message || "Invalid or expired token"],
          401,
          "Unauthorized"
        );
      }

      req.user = decoded;
      next();
    });
  },

  authorize: (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return ApiResponse.error(
          res,
          ["User not authenticated"],
          401,
          "Unauthorized"
        );
      }

      if (!allowedRoles.includes(req.user.role)) {
        return ApiResponse.error(res, ["Access denied"], 403, "Forbidden");
      }

      next();
    };
  },
};

module.exports = { AuthMiddleware };