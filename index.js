const jsonServer = require("json-server");
const server = jsonServer.create();
const router = jsonServer.router("db.json");
const morgan = require("morgan");
const auth = require("json-server-auth");
const cors = require('cors');
const jwt = require("jsonwebtoken");
const { AuthMiddleware } = require("./middleware");
const { ApiResponse } = require("./ApiResponse")
const fs = require('fs');
const path = require('path');


require("dotenv").config();
server.use(cors())
server.use(jsonServer.bodyParser);
const port = process.env.PORT || 8080;
server.db = router.db;


server.post("/register", (req, res) => {
    console.log(req);

    const { email, password, fullname } = req.body;

    const existingUser = server.db.get("users").find({ email }).value();
    if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
    }

    const newUser = { email, password, fullname, id: Date.now() };
    console.log(newUser);

    server.db.get("users").push(newUser).write();

    const token = "dummy-jwt-token";
    res.status(201).json({ user: newUser, token });
});

server.post("/login", (req, res) => {
    const { email, password } = req.body;
    const user = server.db.get("users").find({ email }).value();


    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const webtoken = jwt.sign({ userId: user._id, role: user.role }, process.env.SECRET_KEY, {
        expiresIn: "1h",
    });

    if (user.password === password) {
        const token = webtoken;
        return res.status(200).json({ token, fullname: user.fullname, role: user.role });
    }


    return res.status(401).json({ message: "Invalid password" });
});


server.post("/books", AuthMiddleware.authenticate, AuthMiddleware.authorize(["admin"]), async (req, res) => {
    try {
        if (req.user.role !== "admin") {
            return ApiResponse.error(res, ["Unauthorized"], 403, "Access denied");
        }

        const { title, author, genre, publicationYear, description, coverImage } =
            req.body;

        if (!title || !author || !genre || !publicationYear) {
            return ApiResponse.error(res, [], 400, "All fields are required");
        }

        if (!coverImage) {
            coverImage = "https://i.imgur.com/NAZWTGP.png"
        }

        const nextId = books.length > 0 ? Math.max(...books.map(b => b.id)) + 1 : 1;


        const newBook = {
            _id: nextId,
            title,
            author,
            genre: [genre],
            publicationYear,
            description,
            coverImage,
        };

        await server.db.get("books").push(newBook).write();
        return ApiResponse.success(res, newBook, 201, "Book added successfully");
    } catch (err) {
        console.error("Error in addBook:", err);
        return ApiResponse.error(res, [err.message], 500, "Failed to add book");
    }
})

server.get("/book", async (req, res) => {
    try {
        const { genre, author, publicationYear, search } = req.query;

        const books = router.db.get("books").value();


        // Filter manually
        let filtered = books.filter(book => {
            const matchGenre = genre ? book.genre?.some(g => g.toLowerCase().includes(genre.toLowerCase())) : true;
            const matchAuthor = author ? book.author?.toLowerCase().includes(author.toLowerCase()) : true;
            const matchYear = publicationYear ? book.publicationYear == Number(publicationYear) : true;
            const matchSearch = search
                ? book.title?.toLowerCase().includes(search.toLowerCase())
                : true;

            return matchGenre && matchAuthor && matchYear && matchSearch;
        });

        return ApiResponse.success(res, filtered, 200, "Books fetched successfully");
    } catch (err) {
        console.error("Error in getBooks:", err);
        return ApiResponse.error(res, [err.message], 500, "Failed to fetch books");
    }
})

server.get("/books/:_id", (req, res) => {
    try {
        console.log("COmming");

        const { id } = req.params;
        const filePath = path.join(__dirname, 'db.json');
        const db = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const book = db.books.find(b => String(b.id) === String(id));

        if (!book) {
            return ApiResponse.error(res, [], 404, "Book not found");
        }

        return ApiResponse.success(res, book, 200, "Book fetched successfully");
    } catch (err) {
        console.error("Error in getBookById:", err);
        return ApiResponse.error(res, [err.message], 500, "Failed to fetch book");
    }
})

server.use(morgan("dev"));
server.use(jsonServer.bodyParser);
server.use(auth);
server.use(router);

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});