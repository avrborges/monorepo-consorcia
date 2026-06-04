const express = require("express");
const router = express.Router();

// Mock DB
let users = [];

// GET
router.get("/", (req, res) => {
    res.json(users);
});

// GET POR ID
router.get ("/:id", (req, res) => {
    const {id} = req.params
    const user = users.find(u => u.id == id);
    if (!user) {
        return res.status(404).json({error: "Usuario no encontrado"});
    }
    res.json(user);
})

// POST
router.post("/", (req, res) => {
    const {name} = req.body;
    if(!name) {
        return res.status(400).json({error: "El nombre es obligatorio"});
    }
    const newUser = {
        id: Date.now(),
        name
    };
    users.push(newUser);
    res.status(201).json(newUser);
})

// DELETE
router.delete("/:id", (req, res) => {
    const {id} = req.params;
    const userIndex = users.findIndex(u => u.id == id);
    if (userIndex === -1) {
        return res.status(404).json({error: "Usuario no encontrado"});
    }

    const deleteUser = users.splice(userIndex, 1)
    res.json({
        message: "Usuario eliminado",
        user: deleteUser[0]
    });
});

// PUT
router.put("/:id", (req, res) => {
    const {id} = req.params;
    const {name} = req.body;

    if(!name) {
        return res.status(400).json({error: "El nombre es obligatorio"});
    }

    const user = users.find(u => u.id == id);

    if(!user) {
        return res.status(404).json({error: "Usuario no encontrado"});
    }

    user.name = name
    res.json ({
        message: "Usuario actualizado",
        user
    });
});

module.exports = router;